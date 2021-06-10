export type Payload = {
  op: number; // opcode
  d?: unknown; // data
  s?: number; // sequence
  t?: string; // type as UPPER_SNAKE_CASE
  n?: string; // nonce
};

type Config = Record<string, boolean>;

interface TreatmentConfig {
  id: number;
  label: string;
  config: Config;
}

export interface ExperimentConfig {
  id: string;
  label: string;
  kind: "user" | "guild";
  defaultConfig: Config;
  treatments: TreatmentConfig[];
}

export interface GuildExperimentConfig extends ExperimentConfig {
  kind: "guild";
}

export interface UserExperimentConfig extends ExperimentConfig {
  kind: "user";
}

export interface DiscordExperiment {
  id: string;
  type: "user" | "guild";
  title: string;
  description: string[];
  buckets: number[];
}

export interface ManagerState {
  loadedGuildExperiments: GuildExperimentConfig[];
  loadedUserExperiments: UserExperimentConfig[];
  discordExperiments: DiscordExperiment[];
}
