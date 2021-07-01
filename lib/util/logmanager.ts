import {
  MessageEmbedOptions,
  DiscordAPIError,
  MessageEmbed,
  Snowflake,
  Webhook,
} from "discord.js";
import { ActionLogType, MemberLogType, ModLogType } from "./constants";
import { FireTextChannel } from "../extensions/textchannel";
import RateLimit from "@fire/src/listeners/rateLimit";
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
      forceFullQueue: boolean;
      webhook: Webhook;
      lock: Semaphore;
      locked: any;
    };
    members: {
      queue: { content: logContent; type: MemberLogType }[];
      forceFullQueue: boolean;
      webhook: Webhook;
      lock: Semaphore;
      locked: any;
    };
    action: {
      queue: { content: logContent; type: ActionLogType }[];
      forceFullQueue: boolean;
      webhook: Webhook;
      lock: Semaphore;
      locked: any;
    };
  };
  rateLimitListener: RateLimit;

  constructor(client: Fire, guild: FireGuild) {
    this.client = client;
    this.guild = guild;
    this._data = {
      moderation: {
        lock: new Semaphore(1),
        get locked() {
          return this.lock.getPermits() == 0;
        },
        forceFullQueue: false,
        webhook: null,
        queue: [],
      },
      members: {
        lock: new Semaphore(1),
        get locked() {
          return this.lock.getPermits() == 0;
        },
        forceFullQueue: false,
        webhook: null,
        queue: [],
      },
      action: {
        lock: new Semaphore(1),
        get locked() {
          return this.lock.getPermits() == 0;
        },
        forceFullQueue: false,
        webhook: null,
        queue: [],
      },
    };
    this.rateLimitListener = this.client.getListener("rateLimit") as RateLimit;
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
    if (!this.rateLimitListener)
      this.rateLimitListener = this.client.getListener(
        "rateLimit"
      ) as RateLimit;

    const data = this._data.moderation;
    if (data.forceFullQueue && data.queue.length < 10)
      return data.queue.push({ content, type });

    const acquired = data.lock.tryAcquire();
    if (!acquired) return data.queue.push({ content, type });

    if (
      this.rateLimitListener?.limited.includes(
        `/webhooks/:id/${data.webhook?.token}`
      )
    ) {
      data.lock.release();
      return data.queue.push({ content, type });
    }

    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get<Snowflake>("log.moderation")
      ) as FireTextChannel;
      if (!channel) return;

      const webhooks = await channel.fetchWebhooks().catch(() => {});
      if (!webhooks) return data.queue.push({ content, type });
      data.webhook = webhooks.filter((webhook) => !!webhook.token).first();
    }
    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get<Snowflake>("log.moderation")
      ) as FireTextChannel;
      data.webhook = await channel
        .createWebhook("Moderation Logs", {
          avatar: this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          }),
          reason: this.guild.language.get("LOGGING_WEBHOOK_CREATE", {
            type: "moderation",
          }) as string,
        })
        .catch(() => null);
      if (!data.webhook) return data.queue.push({ content, type });
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
      for (const log of queue) data.queue.push(log); // will push back any that didn't make it
    }

    const releaseEventually = setTimeout(() => {
      data.lock.release();
      if (data.queue.length) {
        const next = data.queue.pop();
        this.handleModeration(next.content, next.type);
      }
    }, 15000);

    let message: string = null;
    if (sending.find((log) => typeof log.content == "string"))
      message =
        (sending.find((log) => typeof log.content == "string")
          .content as string) || null;
    await data.webhook
      .send({
        content: message,
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
      });
    data.lock.release();
    clearTimeout(releaseEventually);
    if (data.queue.length) {
      const next = data.queue.pop();
      this.handleModeration(next.content, next.type);
    }
  }

  async handleMembers(content: logContent, type: MemberLogType) {
    if (!this.rateLimitListener)
      this.rateLimitListener = this.client.getListener(
        "rateLimit"
      ) as RateLimit;

    const data = this._data.members;
    if (data.forceFullQueue && data.queue.length < 10)
      return data.queue.push({ content, type });

    const acquired = data.lock.tryAcquire();
    if (!acquired) return data.queue.push({ content, type });

    if (
      this.rateLimitListener?.limited.includes(
        `/webhooks/:id/${data.webhook?.token}`
      )
    ) {
      data.lock.release();
      return data.queue.push({ content, type });
    }

    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get<Snowflake>("log.members")
      ) as FireTextChannel;
      if (!channel) return;

      const webhooks = await channel.fetchWebhooks().catch(() => {});
      if (!webhooks) return;
      data.webhook = webhooks.filter((webhook) => !!webhook.token).first();
    }
    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get<Snowflake>("log.members")
      ) as FireTextChannel;
      data.webhook = await channel
        .createWebhook("Member Logs", {
          avatar: this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          }),
          reason: this.guild.language.get("LOGGING_WEBHOOK_CREATE", {
            type: "member",
          }) as string,
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
      for (const log of queue) data.queue.push(log); // will push back any that didn't make it
    }

    const releaseEventually = setTimeout(() => {
      data.lock.release();
      if (data.queue.length) {
        const next = data.queue.pop();
        this.handleMembers(next.content, next.type);
      }
    }, 15000);

    let message: string = null;
    if (sending.find((log) => typeof log.content == "string"))
      message =
        (sending.find((log) => typeof log.content == "string")
          .content as string) || null;
    await data.webhook
      .send({
        content: message,
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
      });
    data.lock.release();
    clearTimeout(releaseEventually);
    if (data.queue.length) {
      const next = data.queue.pop();
      this.handleMembers(next.content, next.type);
    }
  }

  async handleAction(content: logContent, type: ActionLogType) {
    if (!this.rateLimitListener)
      this.rateLimitListener = this.client.getListener(
        "rateLimit"
      ) as RateLimit;

    const data = this._data.action;
    if (data.forceFullQueue && data.queue.length < 10)
      return data.queue.push({ content, type });

    const acquired = data.lock.tryAcquire();
    if (!acquired) return data.queue.push({ content, type });

    if (
      this.rateLimitListener?.limited.includes(
        `/webhooks/:id/${data.webhook?.token}`
      )
    ) {
      data.lock.release();
      return data.queue.push({ content, type });
    }

    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get<Snowflake>("log.action")
      ) as FireTextChannel;
      if (!channel) return;

      const webhooks = await channel.fetchWebhooks().catch(() => {});
      if (!webhooks) return;
      data.webhook = webhooks.filter((webhook) => !!webhook.token).first();
    }
    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get<Snowflake>("log.action")
      ) as FireTextChannel;
      data.webhook = await channel
        .createWebhook("Action Logs", {
          avatar: this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          }),
          reason: this.guild.language.get("LOGGING_WEBHOOK_CREATE", {
            type: "action",
          }) as string,
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
      for (const log of queue) data.queue.push(log); // will push back any that didn't make it
    }

    const releaseEventually = setTimeout(() => {
      data.lock.release();
      if (data.queue.length) {
        const next = data.queue.pop();
        this.handleAction(next.content, next.type);
      }
    }, 15000);

    let message: string = null;
    if (sending.find((log) => typeof log.content == "string"))
      message =
        (sending.find((log) => typeof log.content == "string")
          .content as string) || null;
    await data.webhook
      .send({
        content: message,
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
      });
    data.lock.release();
    clearTimeout(releaseEventually);
    if (data.queue.length) {
      const next = data.queue.pop();
      this.handleAction(next.content, next.type);
    }
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
      const channelId = this.guild.settings.get<string>(`log.${type}`);
      if (!channelId || !newWebhook || newWebhook.channelID != channelId)
        this._data[type].webhook = null;
    }
  }
}
