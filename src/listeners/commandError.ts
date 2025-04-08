import { FireMessage } from "@fire/lib/extensions/message";
import { BaseFakeChannel } from "@fire/lib/interfaces/misc";
import { Command, InvalidArgumentContextError } from "@fire/lib/util/command";
import { Listener } from "@fire/lib/util/listener";
import { ConfigError } from "@fire/lib/util/settings";
import { DMChannel, GuildChannel, ThreadChannel } from "discord.js";

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
    if (error instanceof InvalidArgumentContextError)
      return await message.error("COMMAND_ERROR_INVALID_ARGUMENT", {
        arg: error.argument,
      });
    else if (error instanceof ConfigError) {
      switch (error.message) {
        case "SERVICE_UNAVAILABLE": {
          return await message.error(
            "COMMAND_ERROR_CONFIG_UPDATE_SERVICE_UNAVAILABLE"
          );
        }
        case "UPDATE_SETTINGS_TIMEOUT": {
          return await message.error("COMMAND_ERROR_CONFIG_UPDATE_TIMEOUT");
        }
        case "RETRIEVE_SETTINGS_TIMEOUT": {
          return await message.error("COMMAND_ERROR_CONFIG_RETRIEVE_TIMEOUT");
        }
      }
    }

    const point = {
      measurement: "commands",
      tags: {
        type: "error",
        command: command.id,
        cluster: this.client.manager.id.toString(),
        shard: message.shard.toString(),
        user_id: message.author.id, // easier to query tag
      },
      fields: {
        type: "error",
        command: command.id,
        // TODO: possibly rename to "source" rather than guild?
        guild: message.source,
        user: `${message.author} (${message.author.id})`,
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
      const extras = {
        "message.id": message.id,
        "guild.id": message.guildId,
        "source.name": message.source,
        "source.shard": message.shard,
        "channel.id": message.channel?.id || "0",
        "channel.name": this.getChannelName(message.channel) || "Unknown",
        "command.name": command.id,
        env: process.env.NODE_ENV,
      };
      try {
        // sometimes leads to circular structure error
        extras["command.args"] = JSON.stringify(args);
      } catch {}
      const eventId = sentry.captureException(error, {
        extra: extras,
        user: { id: message.author.id, username: message.author.toString() },
      });
      if (eventId) point.fields.sentry = eventId;
    }
    this.client.manager.writeToInflux([point]);

    if (message.channel instanceof ThreadChannel) {
      const checks = await this.client.commandHandler
        .preThreadChecks(message)
        .catch(() => {});
      if (!checks) return;
    }

    try {
      if (!message.author.isSuperuser()) {
        return await message.error("COMMAND_ERROR_GENERIC", {
          id: message?.util?.parsed?.alias ?? command.id,
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
