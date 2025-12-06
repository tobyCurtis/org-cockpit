<script lang="ts">
  import { onMount } from "svelte";
  import type { SfOrg, OrgListResult, AddOrgMode } from "$lib/api";
  import { getAuthorizedOrgs, openOrg, addOrg } from "$lib/api";
  import { orderBy } from "lodash-es";
  import AddOrgSection from "$lib/components/layout/AddOrgSection.svelte";
  import AppHeader from "$lib/components/layout/AppHeader.svelte";
  import OrgAccordion from "$lib/components/orgs/OrgAccordion.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Toolbar from "$lib/components/layout/Toolbar.svelte";
  import ScratchOrgSection from "$lib/components/layout/ScratchOrgSection.svelte";
  import OtherOrgSection from "$lib/components/layout/OtherOrgSection.svelte";

  let orgs: SfOrg[] = [];

  type OrgGroup = {
    namespace: string;
    prodOrgs: SfOrg[];
    sandboxOrgs: SfOrg[];
  };

  let groupedOrgs: OrgGroup[] = [];
  $: hasGroupedOrgs = Boolean(groupedOrgs.length);
  let scratchOrgs: SfOrg[] = [];
  $: hasScratchOrgs = Boolean(scratchOrgs.length);
  let ungroupedOrgs: SfOrg[] = [];
  $: hasUnGroupedOrgs = Boolean(ungroupedOrgs.length);

  let searchTerm = "";

  function matchesSearch(org: SfOrg, term: string): boolean {
    if (!term) return true;
    const q = term.toLowerCase();

    const alias = org.alias?.toLowerCase() || "";
    const instance = org.instanceUrl?.toLowerCase() || "";

    return alias.includes(q) || instance.includes(q);
  }

  $: trimmedSearch = searchTerm.trim().toLowerCase();
  $: filteredGroupedOrgs = !trimmedSearch
    ? groupedOrgs
    : groupedOrgs
        .map((group) => {
          const prodOrgs = group.prodOrgs.filter((o) =>
            matchesSearch(o, trimmedSearch),
          );
          const sandboxOrgs = group.sandboxOrgs.filter((o) =>
            matchesSearch(o, trimmedSearch),
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

  let expandedNamespaces: Record<string, boolean> = {};

  let loading = true;
  let adding = false;
  let addMenuOpen = false;
  let addMode: AddOrgMode | null = null; // 'production' | 'sandbox' | 'custom' | null
  let aliasInput = "";
  let customInstanceUrl = "";
  let error: string | null = null;

  function getNamespace(instanceUrl?: string): string | null {
    if (!instanceUrl) return null;

    try {
      const url = new URL(instanceUrl);
      const host = url.hostname;

      const firstPart = host.split(".")[0];
      const ns = firstPart.split("--")[0];
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

      orgs = orderBy(
        [...nonScratch, ...scratch],
        [(org) => org.alias?.toLowerCase() || org.username.toLowerCase()],
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
    resetAddState();
    adding = false;
  }

  async function handleStartLogin() {
    if (!addMode) return;
    error = null;

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

  function isDefault(org: SfOrg): boolean {
    return org.isDefaultUsername === true || org.defaultMarker === "(U)";
  }
</script>

<main>
  <AppHeader
    {loading}
    {adding}
    on:refresh={loadOrgs}
    on:addorg={(event) => startAdd(event.detail.kind)}
  />

  <AddOrgSection
    {addMode}
    bind:aliasInput
    bind:customInstanceUrl
    {adding}
    on:startlogin={handleStartLogin}
    on:cancel={cancelAdd}
  />
  {#if error}
    <div class="error">Error: {error}</div>
  {/if}

  {#if loading}
    <Spinner />
  {:else if !loading && !hasGroupedOrgs && !hasScratchOrgs && !hasUnGroupedOrgs}
    <p>
      No authorized orgs found. Try running <code>sf org login web</code> in a terminal.
    </p>
  {:else}
    <Toolbar
      bind:searchTerm
      {hasGroupedOrgs}
      on:expandall={expandAll}
      on:collapseall={collapseAll}
    />

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
      <ScratchOrgSection
        scratchOrgs={filteredScratchOrgs}
        isDefaultFn={isDefault}
        on:open={(event) => handleOpen(event.detail.org)}
      />
    {/if}

    {#if filteredUngroupedOrgs.length > 0}
      <OtherOrgSection
        otherOrgs={filteredUngroupedOrgs}
        isDefaultFn={isDefault}
        on:open={(event) => handleOpen(event.detail.org)}
      />
    {/if}

    {#if trimmedSearch && filteredGroupedOrgs.length === 0 && filteredScratchOrgs.length === 0 && filteredUngroupedOrgs.length === 0}
      <p>No orgs match your search.</p>
    {/if}
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

  .error {
    color: #b00020;
    margin-bottom: 0.5rem;
  }
</style>
