<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";

  export let value = "";
  export let placeholder = "";
  export let showButtons = true;
  export let buttonsInline = true;
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
    <div class={`buttons ${buttonsInline ? "inline" : "stacked"}`}>
      <Button variant="secondary" size="sm" on:click={handleSecondary}>
        {secondaryLabel}
      </Button>
      <Button variant="primary" size="sm" on:click={handlePrimary} disabled={primaryDisabled}>
        {primaryLabel}
      </Button>
    </div>
  {/if}
</div>

<style>
  .custom-input {
    margin: 0.5rem 0 1rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .custom-input input {
    flex: 1 1 auto;
    min-width: 220px;
    padding: 0.25rem 0.4rem;
    font-size: 0.85rem;
  }

  .buttons {
    display: flex;
    gap: 0.4rem;
  }

  .buttons.stacked {
    width: 100%;
    justify-content: flex-end;
  }
</style>
