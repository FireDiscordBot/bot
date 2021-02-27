import {
  MessageEmbedOptions,
  DiscordAPIError,
  MessageEmbed,
  TextChannel,
  Webhook,
} from "discord.js";
import { ActionLogType, MemberLogType, ModLogType } from "./constants";
import { FireGuild } from "../extensions/guild";
import Semaphore from "semaphore-async-await";
import { Fire } from "../Fire";

type logContent = string | MessageEmbed | MessageEmbedOptions;

export class GuildLogManager {
  guild: FireGuild;
  client: Fire;
  private _data: {
    moderation: {
      queue: { content: logContent; type: ModLogType }[];
      webhook: Webhook;
      lock: Semaphore;
      locked: any;
    };
    members: {
      queue: { content: logContent; type: MemberLogType }[];
      webhook: Webhook;
      lock: Semaphore;
      locked: any;
    };
    action: {
      queue: { content: logContent; type: ActionLogType }[];
      webhook: Webhook;
      lock: Semaphore;
      locked: any;
    };
  };

  constructor(client: Fire, guild: FireGuild) {
    this.client = client;
    this.guild = guild;
    this._data = {
      moderation: {
        lock: new Semaphore(1),
        get locked() {
          return this.lock.getPermits() == 0;
        },
        webhook: null,
        queue: [],
      },
      members: {
        lock: new Semaphore(1),
        get locked() {
          return this.lock.getPermits() == 0;
        },
        webhook: null,
        queue: [],
      },
      action: {
        lock: new Semaphore(1),
        get locked() {
          return this.lock.getPermits() == 0;
        },
        webhook: null,
        queue: [],
      },
    };
  }

  hasWebhooks(channelId: string) {
    const hooks = [
      this._data.action.webhook,
      this._data.members.webhook,
      this._data.moderation.webhook,
    ];
    return !!hooks.filter((hook) => !!hook && hook.channelID == channelId)
      .length;
  }

  async handleModeration(content: logContent, type: ModLogType) {
    const data = this._data.moderation;
    if (data.locked) return data.queue.push({ content, type });

    await data.lock.acquire();
    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get("log.moderation")
      ) as TextChannel;
      if (!channel) return;

      const webhooks = await channel.fetchWebhooks().catch(() => {});
      if (!webhooks) return;
      data.webhook = webhooks.filter((webhook) => !!webhook.token).first();
    }
    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get("log.moderation")
      ) as TextChannel;
      data.webhook = await channel
        .createWebhook("Moderation Logs", {
          avatar: this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          }),
          reason: this.guild.language.get(
            "LOGGING_WEBHOOK_CREATE",
            "moderation"
          ) as string,
        })
        .catch(() => null);
      if (!data.webhook) return;
    }

    const sending: { content: logContent; type: ModLogType }[] = [
      { content, type },
    ];
    if (data.queue.length) {
      const queue =
        typeof content == "string"
          ? data.queue
              .filter((log) => typeof log.content != "string" && log.type) // TODO: check if type is enabled
              .splice(0, 10)
          : data.queue.splice(0, 9);
      while (queue.length && sending.length < 10) sending.push(queue.pop());
    }

    let message: string = null;
    if (sending.find((log) => typeof log.content == "string"))
      message =
        (sending.find((log) => typeof log.content == "string")
          .content as string) || null;
    await data.webhook
      .send(message, {
        username: this.client.user.username,
        avatarURL: this.client.user.displayAvatarURL({
          size: 2048,
          format: "png",
        }),
        embeds: sending
          .filter((log) => typeof log.content != "string")
          .map((log) => log.content) as (MessageEmbed | MessageEmbedOptions)[],
      })
      .catch((e) => {
        if (e instanceof DiscordAPIError)
          if (e.code == 10015) data.webhook = null;
        data.queue.push(...sending.filter((log) => !data.queue.includes(log)));
      })
      .then(() => {
        data.lock.release();
        if (data.queue.length) {
          const next = data.queue.pop();
          this.handleModeration(next.content, next.type);
        }
      });
  }

  async handleMembers(content: logContent, type: MemberLogType) {
    const data = this._data.members;
    if (data.locked) return data.queue.push({ content, type });

    await data.lock.acquire();
    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get("log.members")
      ) as TextChannel;
      if (!channel) return;

      const webhooks = await channel.fetchWebhooks().catch(() => {});
      if (!webhooks) return;
      data.webhook = webhooks.filter((webhook) => !!webhook.token).first();
    }
    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get("log.members")
      ) as TextChannel;
      data.webhook = await channel
        .createWebhook("Member Logs", {
          avatar: this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          }),
          reason: this.guild.language.get(
            "LOGGING_WEBHOOK_CREATE",
            "member"
          ) as string,
        })
        .catch(() => null);
      if (!data.webhook) return;
    }

    const sending: { content: logContent; type: MemberLogType }[] = [
      { content, type },
    ];
    if (data.queue.length) {
      const queue =
        typeof content == "string"
          ? data.queue
              .filter((log) => typeof log.content != "string" && log.type) // TODO: check if type is enabled
              .splice(0, 10)
          : data.queue.splice(0, 9);
      while (queue.length && sending.length < 10) sending.push(queue.pop());
    }

    let message: string = null;
    if (sending.find((log) => typeof log.content == "string"))
      message =
        (sending.find((log) => typeof log.content == "string")
          .content as string) || null;
    await data.webhook
      .send(message, {
        username: this.client.user.username,
        avatarURL: this.client.user.displayAvatarURL({
          size: 2048,
          format: "png",
        }),
        embeds: sending
          .filter((log) => typeof log.content != "string")
          .map((log) => log.content) as (MessageEmbed | MessageEmbedOptions)[],
      })
      .catch((e) => {
        if (e instanceof DiscordAPIError)
          if (e.code == 10015) data.webhook = null;
        data.queue.push(...sending.filter((log) => !data.queue.includes(log)));
      })
      .then(() => {
        data.lock.release();
        if (data.queue.length) {
          const next = data.queue.pop();
          this.handleMembers(next.content, next.type);
        }
      });
  }

  async handleAction(content: logContent, type: ActionLogType) {
    const data = this._data.action;
    if (data.locked) return data.queue.push({ content, type });

    await data.lock.acquire();
    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get("log.action")
      ) as TextChannel;
      if (!channel) return;

      const webhooks = await channel.fetchWebhooks().catch(() => {});
      if (!webhooks) return;
      data.webhook = webhooks.filter((webhook) => !!webhook.token).first();
    }
    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get("log.action")
      ) as TextChannel;
      data.webhook = await channel
        .createWebhook("Action Logs", {
          avatar: this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          }),
          reason: this.guild.language.get(
            "LOGGING_WEBHOOK_CREATE",
            "action"
          ) as string,
        })
        .catch(() => null);
      if (!data.webhook) return;
    }

    const sending: { content: logContent; type: ActionLogType }[] = [
      { content, type },
    ];
    if (data.queue.length) {
      const queue =
        typeof content == "string"
          ? data.queue
              .filter((log) => typeof log.content != "string" && log.type) // TODO: check if type is enabled
              .splice(0, 10)
          : data.queue.splice(0, 9);
      while (queue.length && sending.length < 10) sending.push(queue.pop());
    }

    let message: string = null;
    if (sending.find((log) => typeof log.content == "string"))
      message =
        (sending.find((log) => typeof log.content == "string")
          .content as string) || null;
    await data.webhook
      .send(message, {
        username: this.client.user.username,
        avatarURL: this.client.user.displayAvatarURL({
          size: 2048,
          format: "png",
        }),
        embeds: sending
          .filter((log) => typeof log.content != "string")
          .map((log) => log.content) as (MessageEmbed | MessageEmbedOptions)[],
      })
      .catch((e) => {
        if (e instanceof DiscordAPIError)
          if (e.code == 10015) data.webhook = null;
        data.queue.push(...sending.filter((log) => !data.queue.includes(log)));
      })
      .then(() => {
        data.lock.release();
        if (data.queue.length) {
          const next = data.queue.pop();
          this.handleAction(next.content, next.type);
        }
      });
  }

  async refreshWebhooks() {
    let webhooks = {
      action: this._data.action.webhook,
      members: this._data.members.webhook,
      moderation: this._data.moderation.webhook,
    };

    for (const [type, webhook] of Object.entries(webhooks)) {
      const newWebhook = await this.client
        .fetchWebhook(webhook.id, webhook.token)
        .catch(() => {});
      const channelId = this.guild.settings.get(`log.${type}`);
      if (!channelId || !newWebhook || newWebhook.channelID != channelId)
        this._data[type].webhook = null;
    }
  }
}
