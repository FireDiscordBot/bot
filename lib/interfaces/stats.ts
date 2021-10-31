export interface ClusterStats {
  id: number;
  name: string;
  env: string;
  user: string;
  userId: string;
  uptime: string;
  started: string;
  cpu: number;
  ram: string;
  ramBytes: number;
  totalRam: string;
  totalRamBytes: number;
  pid: number;
  version: string;
  versions: string;
  guilds: number;
  unavailableGuilds: number;
  users: number;
  commands: number;
  restPing: number;
  shards: Shard[];
  error?: true;
}

export interface Shard {
  id: number;
  wsPing: number;
  guilds: number;
  unavailableGuilds: number;
  users: number;
  status: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

export interface DiscoverableGuild {
  name: string;
  id: string;
  icon: string;
  splash: string;
  vanity: string;
  members: number;
  featured: boolean;
  shard?: number;
  cluster?: number;
}

export enum DiscoveryUpdateOp {
  SYNC = 1,
  REMOVE = 2,
  ADD = 3,
  ADD_OR_SYNC = 4,
}
