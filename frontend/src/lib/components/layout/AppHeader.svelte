<script lang="ts">
  import { createEventDispatcher } from "svelte";

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
      <button on:click={handleRefresh}>
        Refresh
      </button>
    {/if}

    <div class="dropdown-trigger">
      <button on:click={toggleAddMenu} disabled={adding}>
        {#if adding}
          Waiting for login…
        {:else}
          Add Org ▾
        {/if}
      </button>

      {#if addMenuOpen}
        <div class="dropdown-menu">
          <button on:click={() => handleAdd("production")}>Production</button>
          <button on:click={() => handleAdd("sandbox")}>Sandbox</button>
          <button on:click={() => handleAdd("custom")}>Custom…</button>
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
</style>
