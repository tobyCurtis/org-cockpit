import { derived, get, writable } from "svelte/store";
import { orderBy } from "lodash-es";
import toast from "svelte-french-toast";
import {
  addOrg,
  cancelAddOrg,
  getAuthorizedOrgs,
  openOrg,
  deleteOrg,
  generateAuthUrl,
  type AddOrgMode,
  type OrgListResult,
  type SfOrg,
} from "$lib/api";

export type OrgGroup = {
  namespace: string;
  prodOrgs: SfOrg[];
  sandboxOrgs: SfOrg[];
};

function getNamespace(instanceUrl?: string): string | null {
  if (!instanceUrl) return null;

  try {
    const url = new URL(instanceUrl);
    const host = url.hostname;

    const firstPart = host.split(".")[0];
    const ns = firstPart.split("--")[0];
    return ns || null;
  } catch {
    return null;
  }
}

function isSandboxOrg(org: SfOrg): boolean {
  const instanceUrl = org.instanceUrl;
  if (!instanceUrl) return false;

  try {
    const url = new URL(instanceUrl);
    const host = url.hostname;
    const beforeSalesforce = host.split("salesforce.com")[0];

    return beforeSalesforce.includes("--");
  } catch {
    return false;
  }
}

function matchesSearch(org: SfOrg, term: string): boolean {
  if (!term) return true;
  const q = term.toLowerCase();

  const alias = org.alias?.toLowerCase() || "";
  const instance = org.instanceUrl?.toLowerCase() || "";

  return alias.includes(q) || instance.includes(q);
}

function createOrgState() {
  const orgs = writable<SfOrg[]>([]);
  const groupedOrgs = writable<OrgGroup[]>([]);
  const scratchOrgs = writable<SfOrg[]>([]);
  const ungroupedOrgs = writable<SfOrg[]>([]);
  const expandedNamespaces = writable<Record<string, boolean>>({});

  const searchTerm = writable("");
  const loading = writable(true);
  const adding = writable(false);
  const addMode = writable<AddOrgMode | null>(null);
  const aliasInput = writable("");
  const customInstanceUrl = writable("");
  const error = writable<string | null>(null);

  const hasGroupedOrgs = derived(groupedOrgs, (value) => Boolean(value.length));
  const hasScratchOrgs = derived(scratchOrgs, (value) => Boolean(value.length));
  const hasUnGroupedOrgs = derived(ungroupedOrgs, (value) => Boolean(value.length));

  const trimmedSearch = derived(searchTerm, (value) => value.trim().toLowerCase());

  const filteredGroupedOrgs = derived(
    [groupedOrgs, trimmedSearch],
    ([$groupedOrgs, $trimmedSearch]) => {
      if (!$trimmedSearch) return $groupedOrgs;

      return $groupedOrgs
        .map((group) => {
          const prodOrgs = group.prodOrgs.filter((o) => matchesSearch(o, $trimmedSearch));
          const sandboxOrgs = group.sandboxOrgs.filter((o) => matchesSearch(o, $trimmedSearch));
          return { ...group, prodOrgs, sandboxOrgs };
        })
        .filter((g) => g.prodOrgs.length || g.sandboxOrgs.length);
    },
  );

  const filteredScratchOrgs = derived(
    [scratchOrgs, trimmedSearch],
    ([$scratchOrgs, $trimmedSearch]) =>
      !$trimmedSearch
        ? $scratchOrgs
        : $scratchOrgs.filter((o) => matchesSearch(o, $trimmedSearch)),
  );

  const filteredUngroupedOrgs = derived(
    [ungroupedOrgs, trimmedSearch],
    ([$ungroupedOrgs, $trimmedSearch]) =>
      !$trimmedSearch
        ? $ungroupedOrgs
        : $ungroupedOrgs.filter((o) => matchesSearch(o, $trimmedSearch)),
  );

  async function loadOrgs() {
    loading.set(true);
    error.set(null);

    try {
      const result: OrgListResult = await getAuthorizedOrgs();
      const scratch = result?.result?.scratchOrgs ?? [];
      const nonScratch = result?.result?.nonScratchOrgs ?? [];

      const sortedOrgs = orderBy(
        [...nonScratch, ...scratch],
        [(org) => org.alias?.toLowerCase() || org.username.toLowerCase()],
      );

      orgs.set(sortedOrgs);

      const groupMap = new Map<string, OrgGroup>();
      const ungrouped: SfOrg[] = [];

      function addToGroup(org: SfOrg, isSandbox: boolean) {
        const ns = getNamespace(org.instanceUrl);

        if (!ns) {
          ungrouped.push(org);
          return;
        }

        let group = groupMap.get(ns);
        if (!group) {
          group = { namespace: ns, prodOrgs: [], sandboxOrgs: [] };
          groupMap.set(ns, group);
        }

        if (isSandbox) {
          group.sandboxOrgs.push(org);
        } else {
          group.prodOrgs.push(org);
        }
      }

      for (const org of nonScratch) {
        addToGroup(org, isSandboxOrg(org));
      }

      const grouped = Array.from(groupMap.values())
        .map((group) => ({
          ...group,
          prodOrgs: orderBy(group.prodOrgs, [
            (o) => o.alias?.toLowerCase() || o.username.toLowerCase(),
          ]),
          sandboxOrgs: orderBy(group.sandboxOrgs, [
            (o) => o.alias?.toLowerCase() || o.username.toLowerCase(),
          ]),
        }))
        .sort((a, b) => a.namespace.localeCompare(b.namespace));
      console.log('grouped', grouped)
      groupedOrgs.set(grouped);

      scratchOrgs.set(
        orderBy(scratch, [(o) => o.alias?.toLowerCase() || o.username.toLowerCase()]),
      );

      ungroupedOrgs.set(
        orderBy(ungrouped, [(o) => o.alias?.toLowerCase() || o.username.toLowerCase()]),
      );

      const nextExpanded: Record<string, boolean> = {};
      for (const g of grouped) {
        nextExpanded[g.namespace] = false;
      }
      expandedNamespaces.set(nextExpanded);
    } catch (e) {
      if (e instanceof Error) error.set(e.message);
      else error.set(String(e));
    } finally {
      loading.set(false);
    }
  }

  function toggleNamespace(ns: string) {
    expandedNamespaces.update((value) => ({
      ...value,
      [ns]: !value[ns],
    }));
  }

  function expandAll() {
    const next: Record<string, boolean> = {};
    for (const g of get(groupedOrgs)) {
      next[g.namespace] = true;
    }
    expandedNamespaces.set(next);
  }

  function collapseAll() {
    const next: Record<string, boolean> = {};
    for (const g of get(groupedOrgs)) {
      next[g.namespace] = false;
    }
    expandedNamespaces.set(next);
  }

  function startAdd(mode: AddOrgMode) {
    error.set(null);

    addMode.set(mode);
    aliasInput.set("");
    customInstanceUrl.set("");
  }

  function resetAddState() {
    addMode.set(null);
    aliasInput.set("");
    customInstanceUrl.set("");
  }

  async function cancelAdd() {
    const wasAdding = get(adding);
    resetAddState();
    adding.set(false);
    if (wasAdding) {
      try {
        await cancelAddOrg();
      } catch (e) {
        console.warn("Failed to cancel add org", e);
      }
    }
  }

  async function startLogin() {
    const mode = get(addMode);
    if (!mode) return;
    error.set(null);

    if (mode === "custom") {
      const url = get(customInstanceUrl).trim();
      if (!url) {
        error.set("Please enter a My Domain URL");
        return;
      }
    }

    adding.set(true);

    try {
      if (mode === "custom") {
        const url = get(customInstanceUrl).trim();
        const alias = get(aliasInput).trim() || undefined;
        await addOrg("custom", url, alias);
      } else {
        const alias = get(aliasInput).trim() || undefined;
        await addOrg(mode, undefined, alias);
      }

      resetAddState();
      await loadOrgs();
    } catch (e) {
      if (e instanceof Error) error.set(e.message);
      else error.set(String(e));
    } finally {
      adding.set(false);
    }
  }

  async function open(org: SfOrg) {
    const target = org.alias || org.username;
    if (!target) {
      error.set("Org has no alias or username to open");
      return;
    }

    try {
      await openOrg(target);
    } catch (e) {
      if (e instanceof Error) error.set(e.message);
      else error.set(String(e));
    }
  }

  function isDefault(org: SfOrg): boolean {
    return org.isDefaultUsername === true || org.defaultMarker === "(U)";
  }

  async function reauthenticate(org: SfOrg) {
    const alias = org.alias?.trim() || undefined;
    const instanceUrl = org.instanceUrl?.trim();
    adding.set(true);
    error.set(null);

    try {
      await addOrg("custom", instanceUrl, alias);
      await loadOrgs();
    } catch (e) {
      if (e instanceof Error) error.set(e.message);
      else error.set(String(e));
    } finally {
      adding.set(false);
    }
  }

  async function remove(org: SfOrg) {
    const target = org.alias || org.username;
    if (!target) {
      error.set("Org has no alias or username to delete");
      return;
    }

    loading.set(true);
    error.set(null);

    try {
      await deleteOrg(target);
      await loadOrgs();
    } catch (e) {
      if (e instanceof Error) error.set(e.message);
      else error.set(String(e));
    } finally {
      loading.set(false);
    }
  }

  async function generateAuthLink(org: SfOrg) {
    const target = org.alias || org.username;
    if (!target) {
      error.set("Org has no alias or username to generate auth URL");
      return;
    }

    error.set(null);
    try {
      await generateAuthUrl(target);
      toast.success("Auth URL copied to clipboard");
    } catch (e) {
      if (e instanceof Error) error.set(e.message);
      else error.set(String(e));
    }
  }

  return {
    orgs,
    groupedOrgs,
    scratchOrgs,
    ungroupedOrgs,
    expandedNamespaces,
    searchTerm,
    loading,
    adding,
    addMode,
    aliasInput,
    customInstanceUrl,
    error,
    hasGroupedOrgs,
    hasScratchOrgs,
    hasUnGroupedOrgs,
    trimmedSearch,
    filteredGroupedOrgs,
    filteredScratchOrgs,
    filteredUngroupedOrgs,
    loadOrgs,
    toggleNamespace,
    expandAll,
    collapseAll,
    startAdd,
    cancelAdd,
    startLogin,
    reauthenticate,
    remove,
    generateAuthLink,
    open,
    isDefault,
  };
}

export const orgState = createOrgState();
