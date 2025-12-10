<script lang="ts">
  import tippy from "svelte-tippy";
  import type { Placement, Props as TippyProps } from "tippy.js";
  import "tippy.js/dist/tippy.css";

  export let content: string = "";
  export let placement: Placement = "top";
  export let delay: TippyProps["delay"] = 100;
  export let interactive = false;
</script>

<span
  class="tippy-trigger"
  use:tippy={{
    content,
    placement,
    delay,
    interactive,
    theme: "light-border",
  }}
>
  <slot />
</span>

<style>
  .tippy-trigger {
    display: inline-flex;
    align-items: center;
    line-height: 0;
  }
</style>
