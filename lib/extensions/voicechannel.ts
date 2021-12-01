import { Fire } from "@fire/lib/Fire";
import { APIMessage } from "discord-api-types";
import {
  ChannelWebhookCreateOptions,
  Collection,
  DataResolver,
  MessageManager,
  MessageOptions,
  MessagePayload,
  Structures,
  VoiceChannel,
  Webhook
} from "discord.js";
import { RawGuildChannelData, RawWebhookData } from "discord.js/typings/rawDataTypes";
import { FireGuild } from "./guild";
import { FireMessage } from "./message";

export class FireVoiceChannel extends VoiceChannel {
  messages: MessageManager;
  declare guild: FireGuild;
  nsfw: boolean = false;
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

  async fetchWebhooks() {
    const data = await this.client.req.channels[this.id].webhooks.get<
      RawWebhookData[]
    >();
    const hooks = new Collection<string, Webhook>();
    for (const hook of data) hooks.set(hook.id, new Webhook(this.client, hook));
    return hooks;
  }

  async createWebhook(
    name: string,
    { avatar, reason }: ChannelWebhookCreateOptions = {}
  ) {
    if (typeof avatar === "string" && !avatar.startsWith("data:")) {
      avatar = await DataResolver.resolveImage(avatar);
    }
    const data = await this.client.req.channels[
      this.id
    ].webhooks.post<RawWebhookData>({
      data: {
        name,
        avatar,
      },
      reason,
    });
    return new Webhook(this.client, data);
  }
}

Structures.extend("VoiceChannel", () => FireVoiceChannel);
