<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";

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
    <Input
      bind:value={searchTerm}
      placeholder="Filter orgs by alias or domain..."
      ariaLabel="Filter orgs by alias or domain"
      width="40%"
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

  .accordion-toolbar-buttons {
    margin-left: auto;
    display: flex;
    gap: 0.5rem;
  }

</style>
