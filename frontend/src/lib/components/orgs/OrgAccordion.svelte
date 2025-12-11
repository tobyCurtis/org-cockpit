<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { SfOrg } from "$lib/api";
  import OrgRow from "$lib/components/orgs/OrgRow.svelte";

  export let namespace: string;
  export let prodOrgs: SfOrg[] = [];
  export let sandboxOrgs: SfOrg[] = [];
  export let expanded = false;
  export let isDefaultFn: ((org: SfOrg) => boolean) | undefined;

  const dispatch = createEventDispatcher();

  const toggle = () => dispatch("toggle");
  const openOrg = (org: SfOrg) => dispatch("open", { org });
  const handleAction = (org: SfOrg, action: string, variant: "prod" | "sandbox" | "scratch") =>
    dispatch("action", { org, action, variant });
</script>

<section class="accordion">
  <button class="accordion-header" type="button" on:click={toggle}>
    <span class="chevron-wrapper" aria-hidden="true">
      <svg class="chevron {expanded ? 'expanded' : ''}" viewBox="0 0 52 52">
        <path
          d="M20.293 14.293a1 1 0 011.414 0l14 14a1 1 0 010 1.414l-14 14a1 1 0 01-1.414-1.414L33.586 29 20.293 15.707a1 1 0 010-1.414z"
        ></path>
      </svg>
    </span>
    <span class="namespace">{namespace}</span>
    <span class="counts">
      {#if prodOrgs.length}
        {prodOrgs.length} prod{prodOrgs.length > 1 ? "s" : ""}
      {/if}
      {#if sandboxOrgs.length}
        {#if prodOrgs.length}
          ·
        {/if}
        {sandboxOrgs.length} sandbox{sandboxOrgs.length > 1 ? "es" : ""}
      {/if}
    </span>
  </button>

  {#if expanded}
    <div class="accordion-body">
      {#if prodOrgs.length}
        <div class="section-label">Production</div>
        {#each prodOrgs as org}
          <OrgRow
            {org}
            {isDefaultFn}
            variant="prod"
            on:open={(event) => openOrg(event.detail.org)}
            on:action={(event) =>
              handleAction(event.detail.org, event.detail.action, "prod")
            }
          />
        {/each}
      {/if}

      {#if sandboxOrgs.length}
        <div class="section-label">Sandboxes</div>
        {#each sandboxOrgs as org}
          <OrgRow
            {org}
            {isDefaultFn}
            variant="sandbox"
            on:open={(event) => openOrg(event.detail.org)}
            on:action={(event) =>
              handleAction(event.detail.org, event.detail.action, "sandbox")
            }
          />
        {/each}
      {/if}
    </div>
  {/if}
</section>

<style>
  .accordion {
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #fff;
    border-radius: 0;
  }

  .accordion-header {
    width: 100%;
    padding: 0.4rem 0.6rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    border: none;
    background: rgba(0, 0, 0, 0.1);
    cursor: pointer;
    outline: none;
    transition: background 0.15s ease-in-out;
    border-radius: 0;
  }

  .accordion-header:hover {
    background: rgba(0, 0, 0, 0.2);
  }

  .chevron-wrapper {
    width: 1rem;
    height: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chevron {
    width: 0.85rem;
    height: 0.85rem;
    fill: #2d2d2d;
    transform: rotate(0deg);
    transition: transform 0.18s ease-out;
  }

  .chevron.expanded {
    transform: rotate(90deg);
  }

  .namespace {
    font-weight: 600;
    color: #666;
  }

  .counts {
    margin-left: auto;
    font-size: 0.8rem;
    color: #666;
  }

  .accordion-body {
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  .section-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #666;
    margin: 0.4rem 0 0.2rem;
  }
</style>
