import {
  FakeChannel,
  SlashCommandMessage,
} from "@fire/lib/extensions/slashcommandmessage";
import { GuildChannel, ThreadChannel, DMChannel } from "discord.js";
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
    message: FireMessage | SlashCommandMessage,
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
      const channel =
        message instanceof SlashCommandMessage
          ? message.realChannel
          : message.channel;
      const extras = {
        "button": "N/A",
        "message.id": message.id,
        "guild.id": message.guild?.id,
        "guild.name": message.guild?.name,
        "guild.shard": message.guild?.shardId || 0,
        "channel.id":
          channel instanceof FakeChannel
            ? channel.real?.id
            : channel?.id || "0",
        "channel.name": this.getChannelName(channel) || "Unknown",
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
    channel: GuildChannel | ThreadChannel | FakeChannel | DMChannel
  ) {
    if (channel instanceof DMChannel) return channel.recipient?.toString();
    else if (channel instanceof FakeChannel)
      return this.getChannelName(channel.real);
    else return channel?.name;
  }
}
