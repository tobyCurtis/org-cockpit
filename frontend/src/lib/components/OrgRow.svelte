<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { SfOrg } from "$lib/api";

  export let org: SfOrg;
  export let isDefaultFn: ((org: SfOrg) => boolean) | undefined;
  export let variant: "prod" | "sandbox" | "scratch" = "prod";
  export let showStatusDot: boolean = true;

  const dispatch = createEventDispatcher<{
    open: { org: SfOrg };
  }>();

  function handleOpen() {
    dispatch("open", { org });
  }

  $: isDefault = isDefaultFn ? isDefaultFn(org) : false;
  $: isSandbox = variant === "sandbox";
  $: isScratch = variant === "scratch";

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

<div class="org-row">
  <div class="line-main">
    <span class="alias">{org.alias || org.username}</span>
    <span class="instance">{org.instanceUrl}</span>

    <div class="badges">
      {#if isSandbox}
        <span class="badge sandbox">Sandbox</span>
      {/if}
      {#if isScratch}
        <span class="badge scratch">Scratch</span>
      {/if}
      {#if isDefault}
        <span class="badge default">Default</span>
      {/if}
      {#if org.isDevHub}
        <span class="badge devhub">Dev Hub</span>
      {/if}
    </div>

    <button type="button" on:click={handleOpen}>Open</button>
  </div>

  <div class="line-meta">
    <span class="meta status-meta">
      {#if org.connectedStatus}
        {#if showStatusDot}
          <span
            class="status-dot {org.connectedStatus === 'Connected' ? 'ok' : 'bad'}"
          ></span>
          {org.connectedStatus}
        {:else}
          Status: {org.connectedStatus}
        {/if}
      {/if}
    </span>

    <span class="meta">
      {#if org.lastUsed}
        Last used: {formatLastUsed(org.lastUsed)}
      {/if}
    </span>
  </div>
</div>

<style>
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

  .badge.scratch {
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

  .line-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
    gap: 1rem;
    margin-top: 0.25rem;
  }

  .status-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 1;
    text-align: left;
    word-break: break-word;
    white-space: normal;
  }

  .status-dot {
    width: 0.55rem;
    height: 0.55rem;
    flex-shrink: 0;
    border-radius: 50%;
    align-self: center;
  }

  .status-dot.ok {
    background-color: #3cb371;
  }

  .status-dot.bad {
    background-color: #d9534f;
  }

  .line-meta .meta:last-child {
    white-space: nowrap;
    text-align: right;
    flex-shrink: 0;
  }

  .meta {
    color: #666;
  }
</style>
