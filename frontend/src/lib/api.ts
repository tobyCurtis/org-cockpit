declare global {
  interface Window {
    electron: any;
  }
}

import type { AddOrgMode, OrgListResult } from "./api/types";
export type { SfOrg, OrgListResult, AddOrgMode } from "./api/types";

export async function getAuthorizedOrgs(): Promise<OrgListResult> {
  return await window.electron.ipcRenderer.invoke('get-orgs');
}

export async function openOrg(target: string): Promise<void> {
  await window.electron.ipcRenderer.invoke('open-org', target);
}

export async function addOrg(
  mode: AddOrgMode,
  instanceUrl?: string,
  alias?: string
): Promise<void> {
  await window.electron.ipcRenderer.invoke('add-org', { mode, instanceUrl, alias });
}
