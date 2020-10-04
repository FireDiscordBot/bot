import { FireMessage } from "../../lib/extensions/message";
import { Listener } from "../../lib/util/listener";
import { Command } from "../../lib/util/command";
import { TextChannel } from "discord.js";
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
    await message.error();

    if (typeof this.client.sentry !== "undefined") {
      const sentry = this.client.sentry;
      sentry.setUser({
        id: message.author.id,
        username: `${message.author.username}#${message.author.discriminator}`,
      });
      sentry.setExtras({
        "message.id": message.id,
        "guild.id": message.guild.id,
        "guild.name": message.guild.name,
        "channel.id": message.channel.id,
        "channel.name": (message.channel as TextChannel).name,
        env: process.env.NODE_ENV,
      });
      sentry.captureException(error);
      sentry.configureScope((scope: Scope) => {
        scope.setUser(null);
        scope.setExtras(null);
      });
    }

    if (!this.client.isOwner(message.author)) {
      return await message.error(
        "COMMAND_ERROR_GENERIC",
        message.util?.parsed?.alias
      );
    } else {
      return await message.channel.send("```js\n" + error.stack + "```");
    }
  }
}
