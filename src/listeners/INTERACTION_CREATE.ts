// The case of the file name is just to signify that
// this is listening to an event directly from the gateway

import {
  Button,
  Interaction,
  SlashCommand,
} from "@fire/lib/interfaces/interactions";
import { SlashCommandMessage } from "@fire/lib/extensions/slashCommandMessage";
import { ButtonMessage } from "@fire/lib/extensions/buttonMessage";
import { constants } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { Scope } from "@sentry/node";

const { emojis } = constants;

export default class InteractionCreate extends Listener {
  constructor() {
    super("INTERACTION_CREATE", {
      emitter: "gateway",
      event: "INTERACTION_CREATE",
    });
  }

  async exec(interaction: Interaction) {
    if (!interaction) return;
    if (interaction.type == 2)
      return await this.handleApplicationCommand(interaction);
    else if (interaction.type == 3) return await this.handleButton(interaction);
    else this.client.console.debug(interaction);
  }

  async handleApplicationCommand(command: SlashCommand) {
    try {
      // should be cached if in guild or fetch if dm channel
      await this.client.channels.fetch(command.channel_id).catch(() => {});
      const message = new SlashCommandMessage(this.client, command);
      await message.channel.ack((message.flags & 64) != 0);
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
      await this.client.commandHandler.handle(message);
      // if (message.sent != "message")
      //   await message.sourceMessage?.delete().catch(() => {});
    } catch (error) {
      const guild = this.client.guilds.cache.get(command.guild_id);
      if (!guild)
        await this.callbackError(command, error).catch(
          async () => await this.webhookError(command, error).catch(() => {})
        );
      if (typeof this.client.sentry != "undefined") {
        const sentry = this.client.sentry;
        sentry.setExtras({
          slashCommand: JSON.stringify(command.data),
          member: command.member
            ? `${command.member.user.username}#${command.member.user.discriminator}`
            : `${command.user.username}#${command.user.discriminator}`,
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

  async handleButton(button: Button) {
    try {
      // should be cached if in guild or fetch if dm channel
      await this.client.channels.fetch(button.channel_id).catch(() => {});
      const message = new ButtonMessage(this.client, button);
      // await message.channel.ack((message.flags & 64) != 0);
      this.client.emit("button", message);
      // if (message.sent != "message")
      //   await message.sourceMessage?.delete().catch(() => {});
    } catch (error) {
      const guild = this.client.guilds.cache.get(button.guild_id);
      if (!guild)
        await this.callbackError(button, error).catch(
          async () => await this.webhookError(button, error).catch(() => {})
        );
      if (typeof this.client.sentry != "undefined") {
        const sentry = this.client.sentry;
        sentry.setExtras({
          button: JSON.stringify(button.data),
          member: button.member
            ? `${button.member.user.username}#${button.member.user.discriminator}`
            : `${button.user.username}#${button.user.discriminator}`,
          channel_id: button.channel_id,
          guild_id: button.guild_id,
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

  async callbackError(interaction: Interaction, error: Error) {
    await this.client.req
      .interactions(interaction.id)(interaction.token)
      .callback.post({
        data: {
          type: 3,
          data: {
            content: `${emojis.error} An error occured while trying to handle this interaction that may be caused by being in DMs or the bot not being present...

If this is a slash command and the bot is not present, try inviting the bot (<${this.client.config.inviteLink}>) and try again.

Error Message: ${error.message}`,
            flags: 64,
          },
        },
      })
      .catch(() => {});
  }

  async webhookError(interaction: Interaction, error: Error) {
    await this.client.req
      .webhooks(this.client.user.id)(interaction.token)
      .post({
        data: {
          content: `${emojis.error} An error occured while trying to handle this interaction that may be caused by being in DMs or the bot not being present...

If this is a slash command and the bot is not present, try inviting the bot (<${this.client.config.inviteLink}>) and try again.

Error Message: ${error.message}`,
        },
      })
      .catch(() => {});
  }
}
