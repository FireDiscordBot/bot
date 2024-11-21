import RateLimit from "@fire/src/listeners/rateLimit";
import { Snowflake } from "discord-api-types/globals";
import {
  DiscordAPIError,
  MessageEmbed,
  MessageEmbedOptions,
  Webhook,
} from "discord.js";
import Semaphore from "semaphore-async-await";
import { Fire } from "../Fire";
import { FireGuild } from "../extensions/guild";
import { FireTextChannel } from "../extensions/textchannel";
import { ActionLogTypes, MemberLogTypes, ModLogTypes } from "./constants";

type logContent = string | MessageEmbed | MessageEmbedOptions;

enum QueueReasons {
  FORCED = "forced",
  LOCKED = "locked",
  RATELIMITED = "ratelimited",
  NO_WEBHOOK = "no_webhook",
  EXCEPTION_WHILE_SENDING = "exception_while_sending",
}

enum LoggerTypes {
  ACTION = "action",
  MEMBERS = "members",
  MODERATION = "moderation",
}

export class GuildLogManager {
  guild: FireGuild;
  client: Fire;
  private _data: {
    moderation: {
      type: LoggerTypes.MODERATION;
      queue: {
        content: logContent;
        type: ModLogTypes;
        reason: QueueReasons;
        error?: Error;
      }[];
      forceFullQueue: boolean;
      webhook: Webhook;
      lock: Semaphore;
      locked: any;
    };
    members: {
      type: LoggerTypes.MEMBERS;
      queue: {
        content: logContent;
        type: MemberLogTypes;
        reason: QueueReasons;
      }[];
      forceFullQueue: boolean;
      webhook: Webhook;
      lock: Semaphore;
      locked: any;
    };
    action: {
      type: LoggerTypes.ACTION;
      queue: {
        content: logContent;
        type: ActionLogTypes;
        reason: QueueReasons;
      }[];
      forceFullQueue: boolean;
      webhook: Webhook;
      lock: Semaphore;
      locked: any;
    };
  };
  rateLimitListener: RateLimit;
  checkQueue: NodeJS.Timer;

  constructor(client: Fire, guild: FireGuild) {
    this.client = client;
    this.guild = guild;
    this._data = {
      moderation: {
        type: LoggerTypes.MODERATION,
        lock: new Semaphore(1),
        get locked() {
          return this.lock.getPermits() == 0;
        },
        forceFullQueue: false,
        webhook: null,
        queue: [],
      },
      members: {
        type: LoggerTypes.MEMBERS,
        lock: new Semaphore(1),
        get locked() {
          return this.lock.getPermits() == 0;
        },
        forceFullQueue: false,
        webhook: null,
        queue: [],
      },
      action: {
        type: LoggerTypes.ACTION,
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
    this.checkQueue = setInterval(() => {
      const loggers = [
        this._data.action,
        this._data.members,
        this._data.moderation,
      ];
      for (const logger of loggers)
        if (
          logger.queue.length &&
          (logger.forceFullQueue ? logger.queue.length >= 10 : true) &&
          !logger.locked
        ) {
          const next = logger.queue.pop();
          switch (logger.type) {
            case LoggerTypes.ACTION:
              this.handleAction(next.content, next.type as ActionLogTypes);
              break;
            case LoggerTypes.MEMBERS:
              this.handleMembers(next.content, next.type as MemberLogTypes);
              break;
            case LoggerTypes.MODERATION:
              this.handleModeration(next.content, next.type as ModLogTypes);
              break;
          }
        }
    }, 5000);
  }

  hasWebhooks(channelId: string) {
    const hooks = [
      this._data.action.webhook,
      this._data.members.webhook,
      this._data.moderation.webhook,
    ];
    return !!hooks.filter((hook) => !!hook && hook.channelId == channelId)
      .length;
  }

  isModerationEnabled() {
    return (
      this.guild.settings.has("log.moderation") &&
      this.guild.channels.cache.has(
        this.guild.settings.get<Snowflake>("log.moderation")
      )
    );
  }

  isMembersEnabled() {
    return (
      this.guild.settings.has("log.members") &&
      this.guild.channels.cache.has(
        this.guild.settings.get<Snowflake>("log.members")
      )
    );
  }

  isActionEnabled() {
    return (
      this.guild.settings.has("log.action") &&
      this.guild.channels.cache.has(
        this.guild.settings.get<Snowflake>("log.action")
      )
    );
  }

  async handleModeration(content: logContent, type: ModLogTypes) {
    if (!this.rateLimitListener)
      this.rateLimitListener = this.client.getListener(
        "rateLimit"
      ) as RateLimit;

    const data = this._data.moderation;
    if (data.forceFullQueue && data.queue.length < 10)
      return data.queue.push({ content, type, reason: QueueReasons.FORCED });

    const acquired = data.lock.tryAcquire();
    if (!acquired)
      return data.queue.push({ content, type, reason: QueueReasons.LOCKED });

    if (
      this.rateLimitListener?.limited.includes(
        `/webhooks/:id/${data.webhook?.token}`
      )
    ) {
      data.queue.push({ content, type, reason: QueueReasons.RATELIMITED });
      return data.lock.release();
    }

    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get<Snowflake>("log.moderation")
      ) as FireTextChannel;
      if (!channel) return;

      const webhooks = await channel.fetchWebhooks().catch(() => {});
      if (!webhooks)
        return data.queue.push({
          content,
          type,
          reason: QueueReasons.NO_WEBHOOK,
        });
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
      if (!data.webhook)
        return data.queue.push({
          content,
          type,
          reason: QueueReasons.NO_WEBHOOK,
        });
    }

    const sending: { content: logContent; type: ModLogTypes }[] = [
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
        if (e instanceof DiscordAPIError && e.code == 10015)
          data.webhook = null;
        else this.client.sentry.captureException(e);
        data.queue.push(
          ...sending
            .filter((log) => !data.queue.find((q) => q.content == log.content))
            .map((log) => ({
              ...log,
              reason: QueueReasons.EXCEPTION_WHILE_SENDING,
              error: e,
            }))
        );
      });
    data.lock.release();
    clearTimeout(releaseEventually);
    if (data.queue.length) {
      const next = data.queue.pop();
      this.handleModeration(next.content, next.type);
    }
  }

  async handleMembers(content: logContent, type: MemberLogTypes) {
    if (!this.rateLimitListener)
      this.rateLimitListener = this.client.getListener(
        "rateLimit"
      ) as RateLimit;

    const data = this._data.members;
    if (data.forceFullQueue && data.queue.length < 10)
      return data.queue.push({ content, type, reason: QueueReasons.FORCED });

    const acquired = data.lock.tryAcquire();
    if (!acquired)
      return data.queue.push({ content, type, reason: QueueReasons.LOCKED });

    if (
      this.rateLimitListener?.limited.includes(
        `/webhooks/:id/${data.webhook?.token}`
      )
    ) {
      data.queue.push({ content, type, reason: QueueReasons.RATELIMITED });
      return data.lock.release();
    }

    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get<Snowflake>("log.members")
      ) as FireTextChannel;
      if (!channel) return;

      const webhooks = await channel.fetchWebhooks().catch(() => {});
      if (!webhooks)
        return data.queue.push({
          content,
          type,
          reason: QueueReasons.NO_WEBHOOK,
        });
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
      if (!data.webhook)
        return data.queue.push({
          content,
          type,
          reason: QueueReasons.NO_WEBHOOK,
        });
    }

    const sending: { content: logContent; type: MemberLogTypes }[] = [
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
        if (e instanceof DiscordAPIError && e.code == 10015)
          data.webhook = null;
        else this.client.sentry.captureException(e);
        data.queue.push(
          ...sending
            .filter((log) => !data.queue.find((q) => q.content == log.content))
            .map((log) => ({
              ...log,
              reason: QueueReasons.EXCEPTION_WHILE_SENDING,
              error: e,
            }))
        );
      });
    data.lock.release();
    clearTimeout(releaseEventually);
    if (data.queue.length) {
      const next = data.queue.pop();
      this.handleMembers(next.content, next.type);
    }
  }

  async handleAction(content: logContent, type: ActionLogTypes) {
    if (!this.rateLimitListener)
      this.rateLimitListener = this.client.getListener(
        "rateLimit"
      ) as RateLimit;

    const data = this._data.action;
    if (data.forceFullQueue && data.queue.length < 10)
      return data.queue.push({ content, type, reason: QueueReasons.FORCED });

    const acquired = data.lock.tryAcquire();
    if (!acquired)
      return data.queue.push({ content, type, reason: QueueReasons.LOCKED });

    if (
      this.rateLimitListener?.limited.includes(
        `/webhooks/:id/${data.webhook?.token}`
      )
    ) {
      data.queue.push({ content, type, reason: QueueReasons.RATELIMITED });
      return data.lock.release();
    }

    if (!data.webhook) {
      const channel = this.guild.channels.cache.get(
        this.guild.settings.get<Snowflake>("log.action")
      ) as FireTextChannel;
      if (!channel) return;

      const webhooks = await channel.fetchWebhooks().catch(() => {});
      if (!webhooks)
        return data.queue.push({
          content,
          type,
          reason: QueueReasons.NO_WEBHOOK,
        });
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
      if (!data.webhook)
        return data.queue.push({
          content,
          type,
          reason: QueueReasons.NO_WEBHOOK,
        });
    }

    const sending: { content: logContent; type: ActionLogTypes }[] = [
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
        if (e instanceof DiscordAPIError && e.code == 10015)
          data.webhook = null;
        else this.client.sentry.captureException(e);
        data.queue.push(
          ...sending
            .filter((log) => !data.queue.find((q) => q.content == log.content))
            .map((log) => ({
              ...log,
              reason: QueueReasons.EXCEPTION_WHILE_SENDING,
              error: e,
            }))
        );
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
      if (!channelId || !newWebhook || newWebhook.channelId != channelId)
        this._data[type].webhook = null;
    }
  }
}
