<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let value = "";
  export let placeholder = "";
  export let showButtons = true;
  export let primaryLabel = "Start Login";
  export let secondaryLabel = "Cancel";
  export let primaryDisabled = false;

  const dispatch = createEventDispatcher();

  const handlePrimary = () => dispatch("primary");
  const handleSecondary = () => dispatch("secondary");
</script>

<div class="custom-input">
  <input
    type="text"
    bind:value={value}
    {placeholder}
  />

  {#if showButtons}
    <button on:click={handlePrimary} disabled={primaryDisabled}>
      {primaryLabel}
    </button>
    <button on:click={handleSecondary}>
      {secondaryLabel}
    </button>
  {/if}
</div>

<style>
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
