// Totally not copied from Discord's experiments/build overrides ;)

// Will be used to give specific guilds/users access to commands/features
// I had a build override thing before but due to limitations of discord.py
// I wasn't able to make it as modular as I can now

import { GuildFeatures } from "discord.js";

export interface Experiment {
  kind: "user" | "guild";
  hash: number;
  id: string;
  buckets: number[];
  active: boolean;
  data: [string, number][]; // overrides
  filters: ExperimentFilters[];
}

export interface ExperimentFilters {
  bucket: number;
  features: GuildFeatures[];
  min_range: number;
  max_range: number;
  min_members: number;
  max_members: number;
  min_id: string;
  max_id: string;
  min_boosts: number;
  max_boosts: number;
  boost_tier: number;
}
