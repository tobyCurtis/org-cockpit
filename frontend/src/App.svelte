<script lang="ts">
  import { onMount } from 'svelte';
  import type { SfOrg, OrgListResult, AddOrgMode } from '$lib/api';
  import { getAuthorizedOrgs, openOrg, addOrg } from '$lib/api';

  let orgs: SfOrg[] = [];
  let loading = true;
  let adding = false;
  let addMenuOpen = false;
  let addingCustom = false;
  let customInstanceUrl = '';
  let error: string | null = null;

  async function loadOrgs() {
    loading = true;
    error = null;
    try {
      const result: OrgListResult = await getAuthorizedOrgs();
      const scratch = result?.result?.scratchOrgs ?? [];
      const nonScratch = result?.result?.nonScratchOrgs ?? [];
      const sandboxes = result?.result?.sandboxes ?? [];
      orgs = [...nonScratch, ...sandboxes, ...scratch];
    } catch (e) {
      if (e instanceof Error) error = e.message;
      else error = String(e);
    } finally {
      loading = false;
    }
  }

  onMount(loadOrgs);

  async function handleOpen(org: SfOrg) {
    const target = org.alias || org.username;
    if (!target) {
      error = 'Org has no alias or username to open';
      return;
    }

    try {
      await openOrg(target);
    } catch (e) {
      if (e instanceof Error) error = e.message;
      else error = String(e);
    }
  }

  async function startAdd(mode: AddOrgMode) {
    addMenuOpen = false;
    error = null;

    if (mode === 'custom') {
      // Show the custom URL input, but don't fire CLI yet
      addingCustom = true;
      return;
    }

    adding = true;
    try {
      await addOrg(mode);
      await loadOrgs();
    } catch (e) {
      if (e instanceof Error) error = e.message;
      else error = String(e);
    } finally {
      adding = false;
    }
  }

  async function handleAddCustom() {
    const url = customInstanceUrl.trim();
    if (!url) {
      error = 'Please enter a My Domain URL';
      return;
    }

    adding = true;
    error = null;
    try {
      await addOrg('custom', url);
      addingCustom = false;
      customInstanceUrl = '';
      await loadOrgs();
    } catch (e) {
      if (e instanceof Error) error = e.message;
      else error = String(e);
    } finally {
      adding = false;
    }
  }

  function formatLastUsed(value?: string): string {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleString();
    } catch {
      return value;
    }
  }

  function isDefault(org: SfOrg): boolean {
    return org.isDefaultUsername === true || org.defaultMarker === '(U)';
  }
</script>



<style>
  main {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding: 1.5rem;
    height: 100vh;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
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
    box-shadow: 0 4px 10px rgba(0,0,0,0.08);
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

  .custom-input {
    margin: 0.5rem 0 1rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .custom-input input {
    flex: 1;
    padding: 0.25rem 0.4rem;
    font-size: 0.85rem;
  }
</style>



<main>
  <header>
    <h1>Salesforce Org Cockpit</h1>
    <div class="controls">
      {#if loading}
        <span>Loading…</span>
      {:else}
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
            <button on:click={() => startAdd('production')}>Production</button>
            <button on:click={() => startAdd('sandbox')}>Sandbox</button>
            <button on:click={() => startAdd('custom')}>Custom…</button>
          </div>
        {/if}
      </div>
    </div>
  </header>

  {#if addingCustom}
    <div class="custom-input">
      <input
        type="text"
        bind:value={customInstanceUrl}
        placeholder="My Domain URL (e.g. cmsapps.my.salesforce.com)"
      />
      <button on:click={handleAddCustom} disabled={adding}>
        Start Login
      </button>
      <button on:click={() => { addingCustom = false; customInstanceUrl = ''; }}>
        Cancel
      </button>
    </div>
  {/if}



  {#if error}
    <div class="error">Error: {error}</div>
  {/if}

  {#if !loading && orgs.length === 0}
    <p>No authorized orgs found. Try running <code>sf org login web</code> in a terminal.</p>
  {:else if orgs.length > 0}
    <ul>
      {#each orgs as org}
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