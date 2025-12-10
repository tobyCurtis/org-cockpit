<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let value = "";
  export let placeholder = "";
  export let type: "text" | "email" | "url" | "password" = "text";
  export let disabled = false;
  export let fullWidth = false;
  export let width: string | undefined = undefined; // e.g., "60%" or "320px"
  export let ariaLabel: string | undefined = undefined;

  const dispatch = createEventDispatcher();

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
    dispatch("input", event);
  }
</script>

<input
  class={`input ${fullWidth ? "full" : ""}`}
  bind:value
  {placeholder}
  {type}
  {disabled}
  aria-label={ariaLabel}
  style={width ? `width:${width}` : undefined}
  on:input={handleInput}
/>

<style>
  .input {
    height: 28px;
    padding: 0 0.75rem;
    font-size: 0.85rem;
    border-radius: 6px;
    border: 1px solid #6d6d6d;
    background: #3a3a3a;
    color: #f0f0f0;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    min-width: 0;
  }

  .input.full {
    width: 100%;
  }

  .input::placeholder {
    color: #b3b3b3;
  }

  .input:focus {
    outline: none;
    border-color: #7ea2ff;
    box-shadow: 0 0 0 2px rgba(126, 162, 255, 0.25);
    background: #444;
  }

  .input:disabled {
    background: #2f2f2f;
    color: #9a9a9a;
    cursor: not-allowed;
  }
</style>
