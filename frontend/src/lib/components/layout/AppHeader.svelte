<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { clickOutside } from "$lib/actions/clickOutside";

  const dispatch = createEventDispatcher<{
    refresh: void;
    addorg: { kind: "production" | "sandbox" | "custom" };
  }>();

  export let loading: boolean;
  export let adding: boolean;

  let addMenuOpen = false;

  function handleRefresh() {
    dispatch("refresh");
  }

  function toggleAddMenu() {
    if (!adding) {
      addMenuOpen = !addMenuOpen;
    }
  }

  function handleAdd(kind: "production" | "sandbox" | "custom") {
    dispatch("addorg", { kind });
    addMenuOpen = false;
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

    <div class="dropdown-trigger" use:clickOutside={() => (addMenuOpen = false)}>
      <Button
        variant="primary"
        size="sm"
        on:click={toggleAddMenu}
        disabled={adding}
      >
        {#if adding}
          Waiting for login…
        {:else}
          Add Org ▾
        {/if}
      </Button>

      {#if addMenuOpen}
        <div class="dropdown-menu">
          <Button
            variant="menu"
            size="sm"
            fullWidth
            on:click={() => handleAdd("production")}
          >
            Production
          </Button>
          <Button
            variant="menu"
            size="sm"
            fullWidth
            on:click={() => handleAdd("sandbox")}
          >
            Sandbox
          </Button>
          <Button
            variant="menu"
            size="sm"
            fullWidth
            on:click={() => handleAdd("custom")}
          >
            Custom…
          </Button>
        </div>
      {/if}
    </div>
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

  .dropdown-menu :global(button) {
    width: 100%;
    text-align: left;
    justify-content: flex-start;
  }
</style>
