import { RawGuildChannelData } from "discord.js/typings/rawDataTypes";
import { VoiceChannel, Structures, MessageManager } from "discord.js";
import { Fire } from "@fire/lib/Fire";
import { FireGuild } from "./guild";

export class FireVoiceChannel extends VoiceChannel {
  messages: MessageManager;
  declare guild: FireGuild;
  declare client: Fire;

  constructor(guild: FireGuild, data?: RawGuildChannelData) {
    super(guild, data);
    // @ts-ignore
    this.messages = new MessageManager(this);
  }
}

Structures.extend("VoiceChannel", () => FireVoiceChannel);
