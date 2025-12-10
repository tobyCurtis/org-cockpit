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

export type AddOrgMode = "production" | "sandbox" | "custom" | "authurl";
