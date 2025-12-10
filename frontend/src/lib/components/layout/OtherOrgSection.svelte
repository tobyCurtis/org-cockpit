<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { SfOrg } from "$lib/api";
  import OrgRow from "$lib/components/orgs/OrgRow.svelte";

  export let otherOrgs: SfOrg[] = [];
  export let isDefaultFn: ((org: SfOrg) => boolean) | undefined;

  const dispatch = createEventDispatcher<{
    open: { org: SfOrg };
    action: { org: SfOrg; action: string; variant: "sandbox" | "prod" | "scratch" };
  }>();

  function handleOpen(event: CustomEvent<{ org: SfOrg }>) {
    dispatch("open", event.detail);
  }

  function handleAction(event: CustomEvent<{ org: SfOrg; action: string; variant: "prod" | "sandbox" | "scratch" }>) {
    dispatch("action", event.detail);
  }
</script>

{#if otherOrgs.length}
  <section class="other-orgs">
    <h2>Other orgs</h2>
    <ul>
      {#each otherOrgs as org}
        <li>
          <OrgRow
            {org}
            {isDefaultFn}
            variant="prod"          
            showStatusDot={false}
            on:open={handleOpen}
            on:action={handleAction}
          />
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .other-orgs {
    margin-top: 1.5rem;
  }

  .other-orgs h2 {
    margin-bottom: 0.5rem;
  }

  .other-orgs ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .other-orgs li + li {
    margin-top: 0.5rem;
  }
</style>
