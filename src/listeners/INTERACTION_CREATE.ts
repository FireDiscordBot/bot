// The case of the file name is just to signify that
// this is listening to an event directly from the gateway

import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";
import { APIInteraction, InteractionType } from "discord-api-types/v9";

export default class InteractionCreate extends Listener {
  constructor() {
    super("INTERACTION_CREATE", {
      emitter: "gateway",
      event: "INTERACTION_CREATE",
    });
  }

  async exec(interaction: APIInteraction) {
    if (!interaction) return;
    if (this.blacklistCheck(interaction)) return;
    // slash command or message component, use client interaction event
    else if (
      interaction.type == InteractionType.ApplicationCommand ||
      interaction.type == InteractionType.MessageComponent ||
      interaction.type == InteractionType.ApplicationCommandAutocomplete ||
      interaction.type == InteractionType.ModalSubmit
    )
      return;
    else {
      const haste = await this.client.util.haste(
        JSON.stringify(interaction, null, 4),
        "interaction.json",
        undefined,
        true
      );
      this.client.sentry.captureEvent({
        level: "warning",
        message: "Unknown Interaction Type",
        timestamp: +new Date(),
        extra: {
          body: haste,
        },
      });
    }
  }

  async callbackError(interaction: APIInteraction, error: Error) {
    return await this.client.req
      .interactions(interaction.id)(interaction.token)
      .callback.post({
        data: {
          type: 4,
          data: {
            content: `${this.client.util.useEmoji(
              "error"
            )} An error occured while trying to handle this interaction that may be caused by being in DMs or the bot not being present...

If this is a slash command, try inviting the bot to a server (<${
              this.client.config.inviteLink
            }>) if you haven't already and try again.

Error Message: ${error.message}`,
            flags: 64,
          },
        },
      });
  }

  async webhookError(interaction: APIInteraction, error: Error) {
    return await this.client.req
      .webhooks(this.client.user.id)(interaction.token)
      .post({
        data: {
          content: `${this.client.util.useEmoji(
            "error"
          )} An error occured while trying to handle this interaction that may be caused by being in DMs or the bot not being present...

If this is a slash command and the bot is not present, try inviting the bot (<${
            this.client.config.inviteLink
          }>) and try again.

Error Message: ${error.message}`,
        },
      });
  }

  blacklistCheck(interaction: APIInteraction) {
    const guild = interaction.guild_id;
    const user = interaction.user
      ? interaction.user.id
      : interaction.member.user.id;

    return this.client.util.isBlacklisted(
      user,
      this.client.guilds.cache.get(guild) as FireGuild
    );
  }
}
