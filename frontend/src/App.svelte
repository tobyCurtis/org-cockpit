<script lang="ts">
  import { onMount } from "svelte";
  import AddOrgSection from "$lib/components/layout/AddOrgSection.svelte";
  import AppHeader from "$lib/components/layout/AppHeader.svelte";
  import OrgAccordion from "$lib/components/orgs/OrgAccordion.svelte";
  import Spinner from "$lib/components/ui/Spinner.svelte";
  import Toolbar from "$lib/components/layout/Toolbar.svelte";
  import ScratchOrgSection from "$lib/components/layout/ScratchOrgSection.svelte";
  import OtherOrgSection from "$lib/components/layout/OtherOrgSection.svelte";
  import { orgState } from "$lib/orgs/orgState";

  const {
    searchTerm,
    hasGroupedOrgs,
    hasScratchOrgs,
    hasUnGroupedOrgs,
    trimmedSearch,
    filteredGroupedOrgs,
    filteredScratchOrgs,
    filteredUngroupedOrgs,
    expandedNamespaces,
    loading,
    adding,
    addMode,
    aliasInput,
    customInstanceUrl,
    error,
    loadOrgs,
    toggleNamespace,
    expandAll,
    collapseAll,
    startAdd,
    cancelAdd,
    startLogin,
    reauthenticate,
    open,
    isDefault,
  } = orgState;

  onMount(loadOrgs);
</script>

<main>
  <AppHeader
    loading={$loading}
    adding={$adding}
    on:refresh={loadOrgs}
    on:addorg={(event) => startAdd(event.detail.kind)}
    on:cancel={cancelAdd}
  />

  <AddOrgSection
    addMode={$addMode}
    bind:aliasInput={$aliasInput}
    bind:customInstanceUrl={$customInstanceUrl}
    adding={$adding}
    on:startlogin={startLogin}
    on:cancel={cancelAdd}
  />
  {#if $error}
    <div class="error">Error: {$error}</div>
  {/if}

  {#if $loading}
    <Spinner />
  {:else if !$loading && !$hasGroupedOrgs && !$hasScratchOrgs && !$hasUnGroupedOrgs}
    <p>
      No authorized orgs found. Try running <code>sf org login web</code> in a terminal.
    </p>
  {:else}
    <Toolbar
      bind:searchTerm={$searchTerm}
      hasGroupedOrgs={$hasGroupedOrgs}
      on:expandall={expandAll}
      on:collapseall={collapseAll}
    />

    {#if $filteredGroupedOrgs.length > 0}
      {#each $filteredGroupedOrgs as group}
        <OrgAccordion
          namespace={group.namespace}
          prodOrgs={group.prodOrgs}
          sandboxOrgs={group.sandboxOrgs}
          expanded={!!$expandedNamespaces[group.namespace]}
          on:toggle={() => toggleNamespace(group.namespace)}
          on:open={(event) => open(event.detail.org)}
          on:action={(event) => {
            const { org, action, variant } = event.detail;
            if (action === "open") {
              open(org);
            } else if (action === "reauth") {
              reauthenticate(org);
            }
          }}
          isDefaultFn={isDefault}
        />
      {/each}
    {/if}

    {#if $filteredScratchOrgs.length > 0}
      <ScratchOrgSection
        scratchOrgs={$filteredScratchOrgs}
        isDefaultFn={isDefault}
        on:open={(event) => open(event.detail.org)}
        on:action={(event) => {
          const { org, action, variant } = event.detail;
          if (action === "open") {
            open(org);
          } else if (action === "reauth") {
            reauthenticate(org);
          }
        }}
      />
    {/if}

    {#if $filteredUngroupedOrgs.length > 0}
      <OtherOrgSection
        otherOrgs={$filteredUngroupedOrgs}
        isDefaultFn={isDefault}
        on:open={(event) => open(event.detail.org)}
        on:action={(event) => {
          const { org, action, variant } = event.detail;
          if (action === "open") {
            open(org);
          } else if (action === "reauth") {
            reauthenticate(org);
          }
        }}
      />
    {/if}

    {#if $trimmedSearch && $filteredGroupedOrgs.length === 0 && $filteredScratchOrgs.length === 0 && $filteredUngroupedOrgs.length === 0}
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
