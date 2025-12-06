<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import AddOrgInputRow from "$lib/components/orgs/AddOrgInputRow.svelte";
  import type { AddOrgMode } from "$lib/api";

  const dispatch = createEventDispatcher<{
    startlogin: void;
    cancel: void;
  }>();

  export let addMode: AddOrgMode | null;
  export let aliasInput: string;
  export let customInstanceUrl: string;
  export let adding: boolean;

  function handleStartLogin() {
    dispatch("startlogin");
  }

  function handleCancel() {
    dispatch("cancel");
  }
</script>

{#if addMode}
  {#if addMode === "custom"}
    <AddOrgInputRow
      bind:value={aliasInput}
      placeholder="Alias (optional, e.g. cms-custom)"
      showButtons={false}
    />

    <AddOrgInputRow
      bind:value={customInstanceUrl}
      placeholder="My Domain URL (e.g. cmsapps.my.salesforce.com)"
      showButtons={true}
      primaryLabel="Start Login"
      secondaryLabel="Cancel"
      primaryDisabled={adding}
      on:primary={handleStartLogin}
      on:secondary={handleCancel}
    />
  {:else}
    <AddOrgInputRow
      bind:value={aliasInput}
      placeholder="Alias (optional, e.g. cms-prod)"
      showButtons={true}
      primaryLabel="Start Login"
      secondaryLabel="Cancel"
      primaryDisabled={adding}
      on:primary={handleStartLogin}
      on:secondary={handleCancel}
    />
  {/if}
{/if}
