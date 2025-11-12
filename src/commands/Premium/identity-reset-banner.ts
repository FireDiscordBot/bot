import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class IdentityResetBanner extends Command {
  constructor() {
    super("identity-reset-banner", {
      description: (language: Language) =>
        language.get("IDENTITY_RESET_BANNER_COMMAND_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageGuild],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      ephemeral: true,
      premium: true,
      parent: "identity-reset",
    });
  }

  async run(command: ApplicationCommandMessage) {
    const updated = await this.client.req
      .guilds(command.guildId)
      .members("@me")
      .patch({
        data: {
          banner: null,
        },
      })
      .catch(() => {});
    if (updated)
      return await command.success("IDENTITY_UPDATE_SUCCESS", {
        guild: command.guild.name,
      });
    else
      return await command.error("IDENTITY_UPDATE_FAILED", {
        guild: command.guild.name,
      });
  }
}
