import { MinecraftVersion, ModInfo } from "@fire/src/modules/mclogs";
import { Snowflake } from "discord-api-types/globals";

export interface MinecraftLogInfo {
  scannedAt: string; // date string
  guild: Snowflake;
  user: string;
  userId: Snowflake;
  loader:
    | "Forge"
    | "Fabric"
    | "Quilt"
    | `Vanilla w/OptiFine HD U ${string}`
    | "Feather";
  loaderVersion: string;
  mcVersion: MinecraftVersion;
  mods: ModInfo[];
  solutions: string[];
  recommendations: string[];
  profile: {
    ign?: string;
    uuid?: string;
  };
}
