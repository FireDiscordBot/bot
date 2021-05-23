// Totally not copied from Discord's experiments/build overrides ;)

// Will be used to give specific guilds/users access to commands/features
// I had a build override thing before but due to limitations of discord.py
// I wasn't able to make it as modular as I can now

export interface Experiment {
  kind: "user" | "guild";
  id: number;
  label: string;
  buckets: number[];
  data: [string, number][];
}

export interface BuildOverride {
  releaseChannel: "development" | "production";
  validForUserIds: string[];
  expiresAt: Date;
}
