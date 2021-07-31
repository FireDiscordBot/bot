import { GuildChannel, ThreadChannel, DMChannel } from "discord.js";
import { BaseFakeChannel } from "@fire/lib/interfaces/misc";
import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";
import { Command } from "@fire/lib/util/command";
import { Scope } from "@sentry/node";

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
    args: any[],
    error: Error
  ) {
    if (message.channel instanceof ThreadChannel) {
      const checks = await this.client.commandHandler
        .preThreadChecks(message)
        .catch(() => {});
      if (!checks) return;
    }

    try {
      await message.error();
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
      sentry.captureException(error);
      sentry.configureScope((scope: Scope) => {
        scope.setUser(null);
        scope.setExtras(null);
      });
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
