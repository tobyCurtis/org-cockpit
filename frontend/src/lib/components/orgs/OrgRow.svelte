<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { SfOrg } from "$lib/api";
  import Button from "$lib/components/ui/Button.svelte";
  import DropdownMenu from "$lib/components/ui/DropdownMenu.svelte";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";

  export let org: SfOrg;
  export let isDefaultFn: ((org: SfOrg) => boolean) | undefined;
  export let variant: "prod" | "sandbox" | "scratch" = "prod";
  export let showStatusDot: boolean = true;

  const dispatch = createEventDispatcher<{
    open: { org: SfOrg };
    action: { org: SfOrg; action: string; variant: typeof variant };
  }>();

  function handleOpen() {
    dispatch("open", { org });
  }

  function handleAction(value: string) {
    dispatch("action", { org, action: value, variant });
  }

  $: isDefault = isDefaultFn ? isDefaultFn(org) : false;
  $: isSandbox = variant === "sandbox";
  $: isScratch = variant === "scratch";
  $: statusIsOk = org.connectedStatus === "Connected";
  $: hasStatus = Boolean(org.connectedStatus);
  $: hasStatusError = hasStatus && !statusIsOk;
</script>

<div class="org-row">
  <div class="line-main">
    {#if hasStatus}
      <Tooltip content={org.connectedStatus} placement="top">
        <span
          class="status-dot {statusIsOk ? 'ok' : 'bad'}"
          aria-label={org.connectedStatus}
        ></span>
      </Tooltip>
    {/if}

    <span class="alias">{org.alias || org.username}</span>
    <span class="instance">{org.instanceUrl}</span>

    <div class="badges">
      {#if org.isDevHub}
        <span class="badge devhub">Dev Hub</span>
      {/if}
    </div>

    <DropdownMenu
      label="Actions"
      size="sm"
      align="left"
      variant="ghost"
      on:select={(event) => handleAction(event.detail.value)}
      items={[
        { label: "Re-Authenticate", value: "reauth" },
        { label: "Delete", value: "delete" },
      ]}
    />

    <Button variant="primary" size="sm" on:click={handleOpen}>Open</Button>
  </div>

  {#if hasStatusError && org.connectedStatus}
    <div class="line-meta error-line">
      Status: {org.connectedStatus}
    </div>
  {/if}
</div>

<style>
  .org-row {
    padding: 0.55rem 0.65rem;
    transition: background 0.15s ease, border-color 0.15s ease;
    border: 1px solid transparent;
    border-radius: 0;
  }

  .org-row:hover {
    background: #f5f7fb;
    border-color: rgba(0, 0, 0, 0.06);
  }

  .org-row:focus-within {
    background: #eef4ff;
    border-color: #bcd3ff;
    outline: none;
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

  .error-line {
    margin-top: 0.25rem;
    font-size: 0.85rem;
    color: #b00020;
  }
</style>
