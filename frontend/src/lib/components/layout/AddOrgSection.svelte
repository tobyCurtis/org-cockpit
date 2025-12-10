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
  export let authUrlInput: string;
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
      placeholder="My Domain URL"
      showButtons={true}
      buttonsInline={false}
      primaryLabel="Start Login"
      secondaryLabel="Cancel"
      primaryDisabled={adding}
      on:primary={handleStartLogin}
      on:secondary={handleCancel}
    />
  {:else if addMode === "authurl"}
    <AddOrgInputRow
      bind:value={aliasInput}
      placeholder="Alias (optional, e.g. cms-auth)"
      showButtons={false}
    />
    <AddOrgInputRow
      bind:value={authUrlInput}
      type="url"
      placeholder="Auth URL"
      showButtons={true}
      buttonsInline={false}
      primaryLabel="Authenticate"
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
      buttonsInline={false}
      primaryLabel="Start Login"
      secondaryLabel="Cancel"
      primaryDisabled={adding}
      on:primary={handleStartLogin}
      on:secondary={handleCancel}
    />
  {/if}
{/if}
