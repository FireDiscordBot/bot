import { Fire } from "@fire/lib/Fire";
import { APIMessage } from "discord-api-types";
import {
  MessageManager,
  MessageOptions,
  MessagePayload,
  Structures,
  VoiceChannel,
} from "discord.js";
import { RawGuildChannelData } from "discord.js/typings/rawDataTypes";
import { FireGuild } from "./guild";
import { FireMessage } from "./message";

export class FireVoiceChannel extends VoiceChannel {
  messages: MessageManager;
  declare guild: FireGuild;
  declare client: Fire;

  constructor(guild: FireGuild, data?: RawGuildChannelData) {
    super(guild, data);
    // @ts-ignore (remove when text in vc is fully supported)
    this.messages = new MessageManager(this);
  }

  async send(
    options: string | MessagePayload | MessageOptions
  ): Promise<FireMessage> {
    let messagePayload: MessagePayload;

    if (options instanceof MessagePayload) {
      messagePayload = options.resolveData();
    } else {
      // @ts-ignore
      messagePayload = MessagePayload.create(this, options).resolveData();
    }

    const { data, files } = await messagePayload.resolveFiles();
    const d = await this.client.req.channels[this.id].messages.post<APIMessage>(
      {
        data,
        files,
      }
    );

    return (this.messages.cache.get(d.id) ??
      // @ts-ignore
      this.messages._add(d)) as FireMessage;
  }
}

Structures.extend("VoiceChannel", () => FireVoiceChannel);
