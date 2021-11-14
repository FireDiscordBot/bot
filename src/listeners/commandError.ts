import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { BaseFakeChannel } from "@fire/lib/interfaces/misc";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { DMChannel, GuildChannel, ThreadChannel } from "discord.js";

const { emojis } = constants;

export default class CommandError extends Listener {
  constructor() {
    super("commandError", {
      emitter: "commandHandler",
      event: "commandError",
    });
  }

  async exec(
    message: FireMessage,
    command: Command,
    args: Record<string, unknown>,
    error: Error
  ) {
    const point = {
      measurement: "commands",
      tags: {
        type: "error",
        command: command.id,
        cluster: this.client.manager.id.toString(),
        shard: message.guild?.shardId.toString() ?? "0",
      },
      fields: {
        guild_id: message.guild ? message.guild.id : "N/A",
        guild: message.guild ? message.guild.name : "N/A",
        user_id: message.author.id,
        user: message.author.toString(),
        message_id: message.id,
        error: "",
        sentry: "",
      },
    };
    try {
      point.fields.error = error.message;
    } catch {}

    if (typeof this.client.sentry != "undefined") {
      const sentry = this.client.sentry;
      sentry.setUser({
        id: message.author.id,
        username: message.author.toString(),
      });
      const extras = {
        button: "N/A",
        "message.id": message.id,
        "guild.id": message.guild?.id,
        "guild.name": message.guild?.name,
        "guild.shard": message.guild?.shardId || 0,
        "channel.id": message.channel?.id || "0",
        "channel.name": this.getChannelName(message.channel) || "Unknown",
        "command.name": command.id,
        env: process.env.NODE_ENV,
      };
      try {
        // sometimes leads to circular structure error
        extras["command.args"] = JSON.stringify(args);
      } catch {}
      sentry.setExtras(extras);
      const eventId = sentry.captureException(error);
      if (eventId) point.fields.sentry = eventId;
      sentry.setExtras(null);
      sentry.setUser(null);
    }
    this.client.influx([point], {
      retentionPolicy: "day",
    });

    if (
      (message instanceof ApplicationCommandMessage ||
        message instanceof ContextCommandMessage) &&
      !this.client.channels.cache.has(message.channelId)
    )
      return await message.channel.send(
        `${emojis.error} I was unable to find the channel you are in. If it is a private thread, you'll need to mention me to add me to the thread or give me \`Manage Threads\` permission`
      ); // could be a private thread fire can't access

    if (message.channel instanceof ThreadChannel) {
      const checks = await this.client.commandHandler
        .preThreadChecks(message)
        .catch(() => {});
      if (!checks) return;
    }

    try {
      if (!message.author.isSuperuser()) {
        return await message.error("COMMAND_ERROR_GENERIC", {
          id: message.util?.parsed?.alias,
        });
      } else {
        return await message.channel.send("```js\n" + error.stack + "```");
      }
    } catch {}
  }

  getChannelName(
    channel: GuildChannel | ThreadChannel | BaseFakeChannel | DMChannel
  ) {
    if (channel instanceof DMChannel) return channel.recipient?.toString();
    else return channel?.name;
  }
}
