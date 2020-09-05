import { FireMessage } from "../../lib/extensions/message";
import { constants } from "../../lib/util/constants";
import { Listener } from "../../lib/util/listener";
import { Command } from "../../lib/util/command";
import { TextChannel } from "discord.js";
import { Scope } from "@sentry/node";

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
    args: any[],
    error: Error
  ) {
    await message.error();
    this.client.sentry.setUser({
      id: message.author.id,
      username: `${message.author.username}#${message.author.discriminator}`,
    });
    this.client.sentry.setExtras({
      "message.id": message.id,
      "guild.id": message.guild.id,
      "guild.name": message.guild.name,
      "channel.id": message.channel.id,
      "channel.name": (message.channel as TextChannel).name,
      env: process.env.NODE_ENV,
    });
    this.client.sentry.captureException(error);
    this.client.sentry.configureScope((scope: Scope) => {
      scope.setUser(null);
      scope.setExtras(null);
    });
    if (!this.client.isOwner(message.author))
      return await message.error("COMMAND_ERROR_GENERIC", command.id);
    else return await message.channel.send("```js\n" + error.stack + "```");
  }
}
