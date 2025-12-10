<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";

  const dispatch = createEventDispatcher<{
    expandall: void;
    collapseall: void;
  }>();

  export let searchTerm: string;
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
        <Button variant="secondary" size="sm" on:click={handleExpandAll}>Expand all</Button>
        <Button variant="secondary" size="sm" on:click={handleCollapseAll}>Collapse all</Button>
      </div>
    {/if}
  </div>

<style>
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
