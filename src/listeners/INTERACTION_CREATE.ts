// The case of the file name is just to signify that
// this is listening to an event directly from the gateway

import { SlashCommandMessage } from "../../lib/extensions/slashCommandMessage";
import { SlashCommand } from "../../lib/interfaces/slashCommands";
import { Listener } from "../../lib/util/listener";
import { Scope } from "@sentry/node";

export default class InteractionCreate extends Listener {
  constructor() {
    super("INTERACTION_CREATE", {
      emitter: "gateway",
      event: "INTERACTION_CREATE",
    });
  }

  async exec(command: SlashCommand) {
    try {
      const message = new SlashCommandMessage(this.client, command);
      if (!message.command) {
        this.client.console.warn(
          `[Commands] Got slash command request for unknown command, /${command.data.name}`
        );
        return await message.error("UNKNOWN_COMMAND");
      } else if (!message.guild && message.command.channel == "guild")
        return await message.error(
          "SLASH_COMMAND_BOT_REQUIRED",
          this.client.config.inviteLink
        );
      await message.generateContent();
      // @ts-ignore
      const handled = await this.client.commandHandler.handle(message);
      if (typeof handled == "boolean" && !handled)
        return await message.error("SLASH_COMMAND_HANDLE_FAIL");
    } catch (error) {
      if (typeof this.client.sentry !== "undefined") {
        const sentry = this.client.sentry;
        sentry.setExtras({
          slashCommand: JSON.stringify(command.data),
          member: `${command.member.user.username}#${command.member.user.discriminator}`,
          channel_id: command.channel_id,
          guild_id: command.guild_id,
          env: process.env.NODE_ENV,
        });
        sentry.captureException(error);
        sentry.configureScope((scope: Scope) => {
          scope.setUser(null);
          scope.setExtras(null);
        });
      }
    }
  }
}
