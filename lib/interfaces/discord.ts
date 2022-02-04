import { APIUser, GuildFeature } from "discord-api-types";
import { Snowflake } from "discord.js";

export interface Experiments {
  assignments: Assignment[];
  guild_experiments: GuildExperiment[];
}

// hash, revision, bucket, override, population
type Assignment = [number, number, number, number, number];

// hash, hashKey, revision, buckets, overrides
// buckets is typed as unkown because typing it would be pain
type GuildExperiment = [
  number,
  string | null,
  number,
  ExperimentBuckets,
  GuildExperimentOverride[]
];

type GuildExperimentOverride = {
  b: number;
  k: Snowflake[];
};

type ExperimentBuckets = [
  [
    [Bucket, ExperimentRange[]][],
    ExperimentFilters[] // filters
  ]
];

export type ExperimentRange = { s: LowerBound; e: UpperBound };
export type ExperimentFilters =
  | FeatureFilter
  | GuildIdRangeFilter
  | GuildMemberCountFilter;

// these are purely for clarity
type Bucket = number;
type LowerBound = number;
type UpperBound = number;

// Filters

// murmur3("guild_has_feature")
export type FeatureFilter = [1604612045, [[number, GuildFeature[]]]];

export type GuildIdRangeFilter = [
  2404720969, // murmur3("guild_id_range")
  [3399957344, string | null], // murmur3("min_id"), minimum id
  [1238858341, string | null] // murmur3("max_id"), maximum id
];

export type GuildMemberCountFilter = [
  2918402255, // murmur3("guild_member_count_range")
  [3399957344, string | null], // murmur3("min_id"), minimum member count
  [1238858341, string | null] // murmur3("max_id"), maximum member count
];

export interface GuildApplicationCommandsUpdate {
  application_commands: ApplicationCommand[];
  applications: Application[];
  guild_id: string;
  nonce: string;
  updated_at: string;
}

export interface ApplicationCommand {
  application_id: string;
  default_permission: boolean;
  description: string;
  id: string;
  listed: boolean;
  name: string;
  permissions: any[];
  type: number;
  version: string;
  options?: ApplicationCommandOption[];
  guild_id?: string;
}

export interface ApplicationCommandOption {
  description: string;
  name: string;
  required?: boolean;
  type: number;
  options?: OptionOption[];
  choices?: Choice[];
}

export interface Choice {
  name: string;
  value: string;
}

export interface OptionOption {
  description: string;
  name: string;
  required: boolean;
  type: number;
}

export interface Application {
  bot: APIUser;
  command_count: number;
  icon: null | string;
  id: string;
  name: string;
}
