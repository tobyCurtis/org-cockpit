<script lang="ts">
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher<{
    expandall: void;
    collapseall: void;
  }>();

  // Search text, owned by parent via bind:
  export let searchTerm: string;

  // Simple boolean from parent: do we have any groups?
  export let hasGroupedOrgs: boolean;

  function handleExpandAll() {
    dispatch("expandall");
  }

  function handleCollapseAll() {
    dispatch("collapseall");
  }
</script>

<div class="accordion-toolbar">
  <input
    type="text"
    class="org-search"
    placeholder="Filter orgs by alias or domain..."
    bind:value={searchTerm}
  />

  {#if hasGroupedOrgs}
    <div class="accordion-toolbar-buttons">
      <button on:click={handleExpandAll}>Expand all</button>
      <button on:click={handleCollapseAll}>Collapse all</button>
    </div>
  {/if}
</div>

<style>
  /* Move your existing toolbar styles here so they’re scoped */

  .accordion-toolbar #expand-all {
    margin-left: auto;
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


  .accordion-toolbar {
    /* existing styles */
  }

  .org-search {
    /* existing styles */
  }

  .accordion-toolbar-buttons {
    /* existing styles */
  }
</style>
