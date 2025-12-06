<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { SfOrg } from "$lib/api";
  import OrgRow from "$lib/components/OrgRow.svelte";

  export let namespace: string;
  export let prodOrgs: SfOrg[] = [];
  export let sandboxOrgs: SfOrg[] = [];
  export let expanded = false;
  export let isDefaultFn: ((org: SfOrg) => boolean) | undefined;

  const dispatch = createEventDispatcher();

  const toggle = () => dispatch("toggle");
  const openOrg = (org: SfOrg) => dispatch("open", { org });

  function formatLastUsed(value?: string): string {
    if (!value) return "";
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleString();
    } catch {
      return value;
    }
  }
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
            showStatusDot={true}
            on:open={(event) => openOrg(event.detail.org)}
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
            showStatusDot={true}
            on:open={(event) => openOrg(event.detail.org)}
          />
        {/each}
      {/if}
    </div>
  {/if}
</section>

<style>
  .accordion {
    border: 1px solid rgba(0, 0, 0, 0.08);
    margin-bottom: 0.75rem;
    background: #fff;
    border-radius: 6px;
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
    padding: 0.4rem 0.6rem 0.5rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  .section-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #666;
    margin: 0.4rem 0 0.2rem;
  }

  .org-row + .org-row {
    margin-top: 0.35rem;
    padding-top: 0.35rem;
    border-top: 1px dashed rgba(0, 0, 0, 0.04);
  }

  .line-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .alias {
    font-weight: 500;
    color: #666;
  }

  .instance {
    flex: 1;
    font-size: 0.8rem;
    color: #555;
    word-break: break-all;
  }

  .badges {
    display: flex;
    gap: 0.25rem;
    margin-right: 0.25rem;
  }

  .badge {
    font-size: 0.7rem;
    padding: 0.05rem 0.3rem;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .badge.sandbox {
    background: #f0f5ff;
    border-color: #c3d4ff;
    color: #666;
  }

  .badge.devhub {
    background: #fff7e6;
    border-color: #ffdaa3;
    color: #666;
  }

  .line-main button {
    font-size: 0.8rem;
    padding: 0.15rem 0.45rem;
  }

  /* ============================================
     FIXED STATUS + META LAYOUT
     ============================================ */

  .line-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
    gap: 1rem;
    margin-top: 0.25rem;
  }

  /* Left side (status + message) */
  .status-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 1;
    text-align: left;
    word-break: break-word;
    white-space: normal;
  }

  /* Status dot — perfectly round + centered */
  .status-dot {
    width: 0.55rem;
    height: 0.55rem;
    flex-shrink: 0;
    border-radius: 50%;
    align-self: center; /* centers vertically next to multi-line text */
  }

  .status-dot.ok {
    background-color: #3cb371;
  }

  .status-dot.bad {
    background-color: #d9534f;
  }

  /* Right side (Last used) */
  .line-meta .meta:last-child {
    white-space: nowrap;
    text-align: right;
    flex-shrink: 0;
  }

  .meta {
    color: #666;
  }
</style>
