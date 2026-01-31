import { Snowflake } from "discord-api-types/globals";
import { ChannelType } from "discord-api-types/v9";
import { GuildFeatures, PremiumTier } from "discord.js";
import { Caches } from "./aether";

export interface ClusterStats {
  id: number;
  name: string;
  env: string;
  user: string;
  userId: string;
  uptime: string;
  launchTime: number;
  started: string;
  ready: boolean;
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
  caches: Caches;
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

export type BadgeType =
  | null
  | "PARTNERED"
  | "VERIFIED"
  | "BOOST_FRIENDS"
  | "BOOST_GROUPS"
  | "BOOST_COMMUNITIES";

export interface DiscoverableGuild {
  name: string;
  id: string;
  icon: string;
  splash: string;
  description: string;
  members: number;
  badge: BadgeType;
  boostTier: PremiumTier;
  features: GuildFeatures[];
  featured: boolean;
}

export interface ExtendedDiscoverableGuild extends DiscoverableGuild {
  online: number;
  owner: {
    id: Snowflake;
    username: string;
    avatar: string;
  };
  emojis: {
    name: string;
    id: string;
    animated: boolean;
  }[];
  stickers: {
    name: string;
    id: string;
    format: number;
  }[];
  channels: {
    name: string;
    id: string;
    type: ChannelType;
    nsfw: boolean;
    position: number;
    parentId: string;
  }[];
  roles: {
    name: string;
    id: string;
    color: number;
    position: number;
    hoist: boolean;
  }[];
  popularCommands: string[];
}

export enum DiscoveryUpdateOp {
  SYNC = 1,
  REMOVE = 2,
  ADD = 3,
  ADD_OR_SYNC = 4,
}
