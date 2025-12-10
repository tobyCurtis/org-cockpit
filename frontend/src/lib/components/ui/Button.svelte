<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let variant: "primary" | "secondary" | "ghost" | "menu" = "primary";
  export let size: "md" | "sm" = "md";
  export let type: "button" | "submit" | "reset" = "button";
  export let disabled = false;
  export let fullWidth = false;
  export let ariaLabel: string | undefined = undefined;

  const dispatch = createEventDispatcher();

  function handleClick(event: MouseEvent) {
    if (disabled) return;
    dispatch("click", event);
  }
</script>

<button
  class={`btn ${variant} ${size} ${fullWidth ? "full" : ""}`}
  {type}
  {disabled}
  aria-label={ariaLabel}
  on:click={handleClick}
>
  <slot />
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.9rem;
    line-height: 1.1;
    border-radius: 8px;
    border: 1px solid transparent;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease,
      box-shadow 0.15s ease;
    background: #4a5c8a;
    color: #fff;
    font-weight: 600;
  }

  .btn.sm {
    padding: 0.32rem 0.6rem;
    font-size: 0.85rem;
    border-radius: 7px;
  }

  .btn.full {
    width: 100%;
  }

  .btn.secondary {
    background: #f5f7fb;
    color: #2d3a4d;
    border-color: rgba(0, 0, 0, 0.08);
  }
  .btn.secondary:hover {
    background: #e9eef9;
    border-color: rgba(0, 0, 0, 0.12);
  }

  .btn.ghost {
    background: transparent;
    color: #4a5c8a;
    border-color: #4a5c8a;
  }
  .btn.ghost:hover {
    background: #eef1f7;
  }

  .btn.menu {
    background: transparent;
    color: #2d3a4d;
    border: none;
    border-radius: 0;
    justify-content: flex-start;
    padding: 0.4rem 0.6rem;
  }

  .btn.menu:hover {
    background: #eef1f7;
  }

  .btn.primary:hover {
    background: #3f527f;
    box-shadow: 0 6px 14px rgba(74, 92, 138, 0.2);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }
</style>
