<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import DropdownMenu from "$lib/components/ui/DropdownMenu.svelte";

  const dispatch = createEventDispatcher<{
    refresh: void;
    addorg: { kind: "production" | "sandbox" | "custom" };
    cancel: void;
  }>();

  export let loading: boolean;
  export let adding: boolean;

  function handleRefresh() {
    dispatch("refresh");
  }

  function handleCancel() {
    dispatch("cancel");
  }

  function handleAdd(kind: "production" | "sandbox" | "custom") {
    dispatch("addorg", { kind });
  }
</script>

<header>
  <h1>Org Cockpit</h1>

  <div class="controls">
    {#if !loading}
      <Button variant="secondary" size="sm" on:click={handleRefresh}>
        Refresh
      </Button>
    {/if}
    {#if adding}
      <Button variant="secondary" size="sm" on:click={handleCancel}>
        Cancel
      </Button>
    {/if}

    <DropdownMenu
      label={adding ? "Waiting for login…" : "Add Org"}
      size="sm"
      variant="primary"
      on:select={(event) => handleAdd(event.detail.value as "production" | "sandbox" | "custom")}
      items={[
        { label: "Production", value: "production", disabled: adding },
        { label: "Sandbox", value: "sandbox", disabled: adding },
        { label: "Custom…", value: "custom", disabled: adding },
      ]}
    />
  </div>
</header>

<style>
  h1 {
    font-size: 1.4rem;
    margin: 0;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    position: relative;
  }
</style>
