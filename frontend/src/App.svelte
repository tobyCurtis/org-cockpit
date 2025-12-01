<script lang="ts">
  import { onMount } from "svelte";
  import type { SfOrg, OrgListResult, AddOrgMode } from "$lib/api";
  import { getAuthorizedOrgs, openOrg, addOrg } from "$lib/api";
  import AddOrgInputRow from "$lib/components/AddOrgInputRow.svelte";
  import OrgAccordion from "$lib/components/OrgAccordion.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { orderBy } from "lodash-es";

  let orgs: SfOrg[] = [];

  type OrgGroup = {
    namespace: string;
    prodOrgs: SfOrg[];
    sandboxOrgs: SfOrg[];
  };

  let groupedOrgs: OrgGroup[] = [];
  let scratchOrgs: SfOrg[] = [];
  let ungroupedOrgs: SfOrg[] = [];

  let searchTerm = "";

  function matchesSearch(org: SfOrg, term: string): boolean {
    if (!term) return true;
    const q = term.toLowerCase();

    const alias = org.alias?.toLowerCase() || "";
    const instance = org.instanceUrl?.toLowerCase() || "";

    return alias.includes(q) || instance.includes(q);
  }

  $: trimmedSearch = searchTerm.trim().toLowerCase();

  // Reactive filtered versions of the groups
  $: filteredGroupedOrgs = !trimmedSearch
    ? groupedOrgs
    : groupedOrgs
        .map((group) => {
          const prodOrgs = group.prodOrgs.filter((o) =>
            matchesSearch(o, trimmedSearch)
          );
          const sandboxOrgs = group.sandboxOrgs.filter((o) =>
            matchesSearch(o, trimmedSearch)
          );
          return { ...group, prodOrgs, sandboxOrgs };
        })
        .filter((g) => g.prodOrgs.length || g.sandboxOrgs.length);

  $: filteredScratchOrgs = !trimmedSearch
    ? scratchOrgs
    : scratchOrgs.filter((o) => matchesSearch(o, trimmedSearch));

  $: filteredUngroupedOrgs = !trimmedSearch
    ? ungroupedOrgs
    : ungroupedOrgs.filter((o) => matchesSearch(o, trimmedSearch));

  // accordion expansion state keyed by namespace
  let expandedNamespaces: Record<string, boolean> = {};

  let loading = true;
  let adding = false; // CLI is running
  let addMenuOpen = false; // Add Org dropdown
  let addMode: AddOrgMode | null = null; // 'production' | 'sandbox' | 'custom' | null
  let aliasInput = ""; // alias for new org
  let customInstanceUrl = ""; // My Domain / instance URL (for custom)
  let error: string | null = null;

  function getNamespace(instanceUrl?: string): string | null {
    if (!instanceUrl) return null;

    try {
      const url = new URL(instanceUrl);
      const host = url.hostname; // e.g. cms1.my.salesforce.com or cms1--full.sandbox.my.salesforce.com

      const firstPart = host.split(".")[0]; // cms1 or cms1--full
      const ns = firstPart.split("--")[0]; // cms1
      return ns || null;
    } catch {
      // in case instanceUrl is something unexpected
      return null;
    }
  }

  function isSandboxOrg(org: SfOrg): boolean {
    const instanceUrl = org.instanceUrl;
    if (!instanceUrl) return false;

    try {
      const url = new URL(instanceUrl);
      const host = url.hostname;
      const beforeSalesforce = host.split("salesforce.com")[0];

      return beforeSalesforce.includes("--");
    } catch {
      return false;
    }
  }

  async function loadOrgs() {
    loading = true;
    error = null;

    try {
      const result: OrgListResult = await getAuthorizedOrgs();
      const scratch = result?.result?.scratchOrgs ?? [];
      const nonScratch = result?.result?.nonScratchOrgs ?? [];

      // optional: keep a flat list if you still want it
      orgs = orderBy(
        [...nonScratch, ...scratch],
        [(org) => org.alias?.toLowerCase() || org.username.toLowerCase()]
      );

      const groupMap = new Map<string, OrgGroup>();
      const ungrouped: SfOrg[] = [];

      function addToGroup(org: SfOrg, isSandbox: boolean) {
        const ns = getNamespace(org.instanceUrl);

        if (!ns) {
          ungrouped.push(org);
          return;
        }

        let group = groupMap.get(ns);
        if (!group) {
          group = { namespace: ns, prodOrgs: [], sandboxOrgs: [] };
          groupMap.set(ns, group);
        }

        if (isSandbox) {
          group.sandboxOrgs.push(org);
        } else {
          group.prodOrgs.push(org);
        }
      }

      // ✅ classify each nonScratch org by My Domain pattern
      for (const org of nonScratch) {
        addToGroup(org, isSandboxOrg(org));
      }

      groupedOrgs = Array.from(groupMap.values())
        .map((group) => ({
          ...group,
          prodOrgs: orderBy(group.prodOrgs, [
            (o) => o.alias?.toLowerCase() || o.username.toLowerCase(),
          ]),
          sandboxOrgs: orderBy(group.sandboxOrgs, [
            (o) => o.alias?.toLowerCase() || o.username.toLowerCase(),
          ]),
        }))
        .sort((a, b) => a.namespace.localeCompare(b.namespace));

      scratchOrgs = orderBy(scratch, [
        (o) => o.alias?.toLowerCase() || o.username.toLowerCase(),
      ]);

      ungroupedOrgs = orderBy(ungrouped, [
        (o) => o.alias?.toLowerCase() || o.username.toLowerCase(),
      ]);

      // reset accordion expansion state (collapsed by default)
      const nextExpanded: Record<string, boolean> = {};
      for (const g of groupedOrgs) {
        nextExpanded[g.namespace] = false;
      }
      expandedNamespaces = nextExpanded;
    } catch (e) {
      if (e instanceof Error) error = e.message;
      else error = String(e);
    } finally {
      loading = false;
    }
  }

  function toggleNamespace(ns: string) {
    expandedNamespaces = {
      ...expandedNamespaces,
      [ns]: !expandedNamespaces[ns],
    };
  }

  function expandAll() {
    const next: Record<string, boolean> = {};
    for (const g of groupedOrgs) {
      next[g.namespace] = true;
    }
    expandedNamespaces = next;
  }

  function collapseAll() {
    const next: Record<string, boolean> = {};
    for (const g of groupedOrgs) {
      next[g.namespace] = false;
    }
    expandedNamespaces = next;
  }

  onMount(loadOrgs);

  async function handleOpen(org: SfOrg) {
    const target = org.alias || org.username;
    if (!target) {
      error = "Org has no alias or username to open";
      return;
    }

    try {
      await openOrg(target);
    } catch (e) {
      if (e instanceof Error) error = e.message;
      else error = String(e);
    }
  }

  function startAdd(mode: AddOrgMode) {
    addMenuOpen = false;
    error = null;

    // Show the appropriate input UI; don't call the CLI yet.
    addMode = mode;
    aliasInput = "";
    customInstanceUrl = "";
  }

  function resetAddState() {
    addMode = null;
    aliasInput = "";
    customInstanceUrl = "";
  }

  function cancelAdd() {
    // Just close the inline input(s) and clear fields
    resetAddState();
    adding = false;
  }

  async function handleStartLogin() {
    if (!addMode) return;

    error = null;

    // For custom orgs, URL is required
    if (addMode === "custom") {
      const url = customInstanceUrl.trim();
      if (!url) {
        error = "Please enter a My Domain URL";
        return;
      }
    }

    adding = true;

    try {
      if (addMode === "custom") {
        const url = customInstanceUrl.trim();
        const alias = aliasInput.trim() || undefined;
        await addOrg("custom", url, alias);
      } else {
        // production / sandbox
        const alias = aliasInput.trim() || undefined;
        await addOrg(addMode, undefined, alias);
      }

      resetAddState();
      await loadOrgs();
    } catch (e) {
      if (e instanceof Error) error = e.message;
      else error = String(e);
    } finally {
      adding = false;
    }
  }

  function formatLastUsed(value?: string): string {
    if (!value) return "";
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleString();
    } catch {
      return value;
    }
  }

  function isDefault(org: SfOrg): boolean {
    return org.isDefaultUsername === true || org.defaultMarker === "(U)";
  }
</script>

<main>
  <header>
    <h1>Org Cockpit</h1>
    <div class="controls">
      {#if !loading}
        <button on:click={loadOrgs}>Refresh</button>
      {/if}

      <div class="dropdown-trigger">
        <button on:click={() => (addMenuOpen = !addMenuOpen)} disabled={adding}>
          {#if adding}
            Waiting for login…
          {:else}
            Add Org ▾
          {/if}
        </button>

        {#if addMenuOpen}
          <div class="dropdown-menu">
            <button on:click={() => startAdd("production")}>Production</button>
            <button on:click={() => startAdd("sandbox")}>Sandbox</button>
            <button on:click={() => startAdd("custom")}>Custom…</button>
          </div>
        {/if}
      </div>
    </div>
  </header>

  {#if addMode}
    {#if addMode === "custom"}
      <!-- Custom org: alias row (full width, no buttons) -->
      <AddOrgInputRow
        bind:value={aliasInput}
        placeholder="Alias (optional, e.g. cms-custom)"
        showButtons={false}
      />
      <!-- Custom org: URL row with Start/Cancel buttons -->
      <AddOrgInputRow
        bind:value={customInstanceUrl}
        placeholder="My Domain URL (e.g. cmsapps.my.salesforce.com)"
        showButtons={true}
        primaryLabel="Start Login"
        secondaryLabel="Cancel"
        primaryDisabled={adding}
        on:primary={handleStartLogin}
        on:secondary={cancelAdd}
      />
    {:else}
      <!-- Production / Sandbox: single row for alias + Start / Cancel -->
      <AddOrgInputRow
        bind:value={aliasInput}
        placeholder="Alias (optional, e.g. cms-prod)"
        showButtons={true}
        primaryLabel="Start Login"
        secondaryLabel="Cancel"
        primaryDisabled={adding}
        on:primary={handleStartLogin}
        on:secondary={cancelAdd}
      />
    {/if}
  {/if}

  {#if error}
    <div class="error">Error: {error}</div>
  {/if}
  {#if loading}
    <Spinner />
  {:else if !loading && groupedOrgs.length === 0 && scratchOrgs.length === 0 && ungroupedOrgs.length === 0}
    <p>
      No authorized orgs found. Try running <code>sf org login web</code> in a terminal.
    </p>
  {:else}
    <!-- Toolbar: search on left, buttons on right -->
    <div class="accordion-toolbar">
      <input
        type="text"
        class="org-search"
        placeholder="Filter orgs by alias or domain..."
        bind:value={searchTerm}
      />

      {#if groupedOrgs.length > 0}
        <div class="accordion-toolbar-buttons">
          <button on:click={expandAll}>Expand all</button>
          <button on:click={collapseAll}>Collapse all</button>
        </div>
      {/if}
    </div>

    {#if filteredGroupedOrgs.length > 0}
      {#each filteredGroupedOrgs as group}
        <OrgAccordion
          namespace={group.namespace}
          prodOrgs={group.prodOrgs}
          sandboxOrgs={group.sandboxOrgs}
          expanded={!!expandedNamespaces[group.namespace]}
          on:toggle={() => toggleNamespace(group.namespace)}
          on:open={(event) => handleOpen(event.detail.org)}
          isDefaultFn={isDefault}
        />
      {/each}
    {/if}

    {#if filteredScratchOrgs.length > 0}
      <h2>Scratch orgs</h2>
      <ul>
        {#each filteredScratchOrgs as org}
          <li>
            <div class="line-main">
              <span class="alias">{org.alias || org.username}</span>
              <span class="instance">{org.instanceUrl}</span>
              <div class="badges">
                {#if isDefault(org)}
                  <span class="badge default">Default</span>
                {/if}
                <span class="badge scratch">Scratch</span>
                {#if org.isDevHub}
                  <span class="badge devhub">Dev Hub</span>
                {/if}
              </div>
              <button on:click={() => handleOpen(org)}>Open</button>
            </div>
            <div class="line-meta">
              <span class="meta">
                {#if org.connectedStatus}
                  Status: {org.connectedStatus}
                {/if}
              </span>
              <span class="meta">
                {#if org.lastUsed}
                  Last used: {formatLastUsed(org.lastUsed)}
                {/if}
              </span>
            </div>
          </li>
        {/each}
      </ul>
    {/if}

    {#if filteredUngroupedOrgs.length > 0}
      <h2>Other orgs</h2>
      <ul>
        {#each filteredUngroupedOrgs as org}
          <li>
            <div class="line-main">
              <span class="alias">{org.alias || org.username}</span>
              <span class="instance">{org.instanceUrl}</span>
              <div class="badges">
                {#if isDefault(org)}
                  <span class="badge default">Default</span>
                {/if}
                {#if org.isDevHub}
                  <span class="badge devhub">Dev Hub</span>
                {/if}
              </div>
              <button on:click={() => handleOpen(org)}>Open</button>
            </div>
            <div class="line-meta">
              <span class="meta">
                {#if org.connectedStatus}
                  Status: {org.connectedStatus}
                {/if}
              </span>
              <span class="meta">
                {#if org.lastUsed}
                  Last used: {formatLastUsed(org.lastUsed)}
                {/if}
              </span>
            </div>
          </li>
        {/each}
      </ul>
    {/if}

    {#if trimmedSearch && filteredGroupedOrgs.length === 0 && filteredScratchOrgs.length === 0 && filteredUngroupedOrgs.length === 0}
      <p>No orgs match your search.</p>
    {/if}
  {/if}

  {#if ungroupedOrgs.length > 0}
    <h2>Other orgs</h2>
    <ul>
      {#each ungroupedOrgs as org}
        <li>
          <div class="line-main">
            <span class="alias">{org.alias || org.username}</span>
            <span class="instance">{org.instanceUrl}</span>
            <div class="badges">
              {#if isDefault(org)}
                <span class="badge default">Default</span>
              {/if}
              {#if org.isDevHub}
                <span class="badge devhub">Dev Hub</span>
              {/if}
            </div>
            <button on:click={() => handleOpen(org)}>Open</button>
          </div>
          <div class="line-meta">
            <span class="meta">
              {#if org.connectedStatus}
                Status: {org.connectedStatus}
              {/if}
            </span>
            <span class="meta">
              {#if org.lastUsed}
                Last used: {formatLastUsed(org.lastUsed)}
              {/if}
            </span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  main {
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    padding: 1.5rem;
    height: 100vh;
    width: 80vw;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .accordion-toolbar {
    display: flex;
    margin-bottom: 0.5em;
  }

  .accordion-toolbar #expand-all {
    margin-left: auto;
  }

  h1 {
    font-size: 1.4rem;
    margin: 0;
  }

  button {
    padding: 0.2rem 0.5rem;
    font-size: 0.85rem;
    border-radius: 4px;
    border: 1px solid #888;
    background: transparent;
    cursor: pointer;
  }

  button:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .line-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .alias {
    font-weight: 600;
  }

  .instance {
    font-size: 0.85rem;
    color: #555;
  }

  .badges {
    display: flex;
    gap: 0.25rem;
    font-size: 0.7rem;
    margin-left: auto;
  }

  .badge {
    border-radius: 999px;
    padding: 0.1rem 0.4rem;
    border: 1px solid rgba(0, 0, 0, 0.3);
  }

  .badge.default {
    font-weight: 600;
  }

  .badge.devhub {
    border-style: dashed;
  }

  .line-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
  }

  .meta {
    color: #666;
  }

  .error {
    color: #b00020;
    margin-bottom: 0.5rem;
  }

  .controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    position: relative;
  }

  .dropdown-trigger {
    position: relative;
  }

  .dropdown-menu {
    position: absolute;
    top: 2rem;
    right: 0;
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.15);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
    border-radius: 4px;
    padding: 0.25rem 0;
    z-index: 10;
    min-width: 140px;
  }

  .dropdown-menu button {
    width: 100%;
    border: none;
    text-align: left;
    padding: 0.35rem 0.6rem;
    font-size: 0.85rem;
    color: black;
  }

  .dropdown-menu button:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .accordion-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.75rem 0;
  }

  .org-search {
    flex: 0 0 260px;
    max-width: 280px;
    padding: 0.25rem 0.4rem;
    font-size: 0.85rem;
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.25);
    background: #fff;
    color: #666;
  }

  .org-search:focus {
    outline: none;
    box-shadow: 0 0 0 2px #1b96ff;
    border-color: #1b96ff;
  }

  .accordion-toolbar-buttons {
    margin-left: auto;
    display: flex;
    gap: 0.5rem;
  }
</style>
