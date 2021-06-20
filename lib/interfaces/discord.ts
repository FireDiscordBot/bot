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
  number,
  number,
  unknown[],
  GuildExperimentOverride[]
];

type GuildExperimentOverride = {
  b: number;
  k: Snowflake[];
};
