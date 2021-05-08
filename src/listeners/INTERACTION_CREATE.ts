// The case of the file name is just to signify that
// this is listening to an event directly from the gateway

import { Button, Interaction } from "@fire/lib/interfaces/interactions";
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
    // slash command, use client interaction event
    else if (interaction.type == 2) return;
    else if (interaction.type == 3) return await this.handleButton(interaction);
    else {
      const haste = await this.client.util.haste(
        JSON.stringify(interaction, null, 4),
        false,
        "json"
      );
      this.client.sentry.captureEvent({
        level: this.client.sentry.Severity.fromString("warning"),
        message: "Unknown Interaction Type",
        timestamp: +new Date(),
        extra: {
          body: haste,
        },
      });
    }
  }

  async handleButton(button: Button) {
    try {
      // should be cached if in guild or fetch if dm channel
      await this.client.channels.fetch(button.channel_id).catch(() => {});
      const message = new ButtonMessage(this.client, button);
      if (!message.custom_id.startsWith("!")) await message.channel.ack();
      else message.custom_id = message.custom_id.slice(1);
      this.client.emit("button", message);
    } catch (error) {
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
    return await this.client.req
      .interactions(interaction.id)(interaction.token)
      .callback.post({
        data: {
          type: 4,
          data: {
            content: `${emojis.error} An error occured while trying to handle this interaction that may be caused by being in DMs or the bot not being present...

If this is a slash command, try inviting the bot to a server (<${this.client.config.inviteLink}>) if you haven't already and try again.

Error Message: ${error.message}`,
            flags: 64,
          },
        },
      });
  }

  async webhookError(interaction: Interaction, error: Error) {
    return await this.client.req
      .webhooks(this.client.user.id)(interaction.token)
      .post({
        data: {
          content: `${emojis.error} An error occured while trying to handle this interaction that may be caused by being in DMs or the bot not being present...

If this is a slash command and the bot is not present, try inviting the bot (<${this.client.config.inviteLink}>) and try again.

Error Message: ${error.message}`,
        },
      });
  }
}
