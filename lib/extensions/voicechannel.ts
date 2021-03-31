import { VoiceChannel, Structures } from "discord.js";
import { FireGuild } from "./guild";
import { Fire } from "@fire/lib/Fire";

export class FireVoiceChannel extends VoiceChannel {
  videoQuality: 1 | 2; // 1 == auto, 2 == 720p
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
    this.videoQuality = data?.video_quality_mode;
  }
}

Structures.extend("VoiceChannel", () => FireVoiceChannel);
