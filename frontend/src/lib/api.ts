declare global {
  interface Window {
    electron: any;
  }
}

export interface SfOrg {
  alias?: string;
  username: string;
  instanceUrl: string;
  connectedStatus?: string;
  isDevHub?: boolean;
  isDefaultUsername?: boolean;
  defaultMarker?: string;
  lastUsed?: string;
}

export interface OrgListResult {
  status: number;
  result: {
    scratchOrgs: SfOrg[];
    nonScratchOrgs: SfOrg[];
    sandboxes: SfOrg[];
    devHubs: SfOrg[];
  };
  warnings: string[];
}

export type AddOrgMode = 'production' | 'sandbox' | 'custom';

export async function getAuthorizedOrgs(): Promise<OrgListResult> {
  return await window.electron.ipcRenderer.invoke('get-orgs');
}

export async function openOrg(target: string): Promise<void> {
  await window.electron.ipcRenderer.invoke('open-org', target);
}

export async function addOrg(mode: AddOrgMode, instanceUrl?: string): Promise<void> {
  await window.electron.ipcRenderer.invoke('add-org', { mode, instanceUrl });
}