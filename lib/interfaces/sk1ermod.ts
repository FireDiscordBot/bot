export interface Sk1erMods {
  [mod_id: string]: Sk1erMod;
}

export interface Sk1erMod {
  mod_ids: string[];
  display: string;
  short: string;
  latest: Latest;
  changelog: Changelog;
  complete_description: string;
  vendor: Vendor;
  properties: Properties;
  owner: string;
}

export interface Changelog {
  [version: string]: { [key: string]: ChangelogEntry[] };
}

export interface ChangelogEntry {
  title: string;
  text: string;
  time: number;
}

export interface Latest {
  [version: string]: string;
}

export interface Properties {
  hide: string;
  mod_id: string;
  not_complete: string;
  display_name: string;
}

export interface Vendor {
  sk1er: boolean;
  showByDefault: boolean;
  name: string;
  website: string;
  twitter: string;
  youtube: string;
}

export interface ModAnalytics {
  total: number;
  week: number;
  online: number;
  day: number;
  days: number;
}
