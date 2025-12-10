<script lang="ts" context="module">
  export type MenuItem = {
    label: string;
    value: string;
    disabled?: boolean;
  };
</script>

<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import Button from "./Button.svelte";
  import { clickOutside } from "$lib/actions/clickOutside";

  export let label = "Menu";
  export let items: MenuItem[] = [];
  export let size: "sm" | "md" = "sm";
  export let align: "left" | "right" = "right";
  export let variant: "primary" | "secondary" | "ghost" | "menu" = "primary";

  let open = false;
  const dispatch = createEventDispatcher<{ select: { value: string } }>();

  function toggle() {
    open = !open;
  }

  function close() {
    open = false;
  }

  function handleSelect(item: MenuItem) {
    if (item.disabled) return;
    dispatch("select", { value: item.value });
    close();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      close();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

<div class="dropdown" use:clickOutside={close}>
  <Button variant={variant} size={size} on:click={toggle}>
    {label} ▾
  </Button>

  {#if open}
    <div class={`menu ${align}`}>
      {#each items as item}
        <Button
          variant="menu"
          size="sm"
          fullWidth
          disabled={item.disabled}
          on:click={() => handleSelect(item)}
        >
          {item.label}
        </Button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .dropdown {
    position: relative;
    display: inline-flex;
    overflow: visible;
  }

  .menu {
    position: absolute;
    top: calc(100% + 0.25rem);
    min-width: 160px;
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.15);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
    border-radius: 6px;
    padding: 0.25rem 0;
    z-index: 20;
  }

  .menu.right {
    right: 0;
  }

  .menu.left {
    left: 0;
  }
</style>
