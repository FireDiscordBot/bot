import { VoiceChannel, Structures } from "discord.js";
import { FireGuild } from "./guild";
import { Fire } from "@fire/lib/Fire";

export class FireVoiceChannel extends VoiceChannel {
  guild: FireGuild;
  region?: string;
  client: Fire;

  constructor(guild: FireGuild, data?: object) {
    super(guild, data);
    // @ts-ignore
    this.region = data.rtc_region;
  }

  _patch(data: any) {
    // @ts-ignore
    super._patch(data);
    this.region = data?.rtc_region;
  }
}

Structures.extend("VoiceChannel", () => FireVoiceChannel);
