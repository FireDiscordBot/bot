import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import VanityURLs from "@fire/src/modules/vanityurls";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteractionOption,
} from "discord.js";

export default class VanityDelete extends Command {
  module: VanityURLs;

  constructor() {
    super("vanity-delete", {
      description: (language: Language) =>
        language.get("VANITY_DELETE_COMMAND_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageGuild],
      args: [
        {
          id: "code",
          type: "string",
          slashCommandType: "code",
          description: (language: Language) =>
            language.get("VANITY_DELETE_CODE_ARGUMENT_DESCRIPTION"),
          autocomplete: true,
          required: true,
          default: null,
        },
        {
          id: "alsoDeleteInvite",
          type: "boolean",
          slashCommandType: "delete-invite",
          description: (language: Language) =>
            language.get("VANITY_DELETE_DELETE_INVITE_ARGUMENT_DESCRIPTION"),
          required: false,
          default: false,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      parent: "vanity",
      slashOnly: true,
    });
  }

  async autocomplete(
    interaction: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ): Promise<ApplicationCommandOptionChoiceData[] | string[]> {
    const focusedValue = focused.value?.toString();
    const vanityResult = await this.client.db.query(
      focusedValue
        ? "SELECT code, invite FROM vanity WHERE gid=$1 AND code ILIKE $2 LIMIT 24;"
        : "SELECT code, invite FROM vanity WHERE gid=$1 LIMIT 24;",
      focusedValue
        ? [interaction.guild.id, `%${focusedValue}%`]
        : [interaction.guild.id]
    );
    if (!vanityResult.rows.length) return [];
    const vanities: ApplicationCommandOptionChoiceData[] = [];
    for await (const vanity of vanityResult) {
      const code = vanity.get("code") as string,
        invite = vanity.get("invite") as string;
      vanities.push({
        name: `${code} - discord.gg/${invite}`,
        value: code,
      });
    }
    vanities.push({
      name: interaction.language.get("VANITY_DELETE_AUTOCOMPLETE_DELETE_ALL"),
      value: "very-secret-value-to-delete-all-vanities",
    });
    return vanities;
  }

  async run(
    command: ApplicationCommandMessage,
    args: { code: string | FireGuild; alsoDeleteInvite: boolean }
  ) {
    if (!args.code) return await command.error("VANITY_DELETE_CODE_REQUIRED");
    else if (args.code == "very-secret-value-to-delete-all-vanities")
      args.code = command.guild;

    if (!this.module)
      this.module = this.client.getModule("vanityurls") as VanityURLs;

    if (typeof args.code == "string") {
      const vanity = await this.module.getVanity(args.code).catch(() => {});
      if (!vanity) return await command.error("VANITY_DELETE_CODE_NOT_FOUND");
      else if (vanity.gid != command.guildId)
        return await command.error("VANITY_DELETE_CODE_WRONG_GUILD");
    }

    const deleted = await this.module.delete(args.code, args.alsoDeleteInvite);
    if (deleted)
      return await command.success(
        args.code == command.guildId
          ? "VANITY_DELETE_SUCCESS_ALL"
          : "VANITY_DELETE_SUCCESS",
        { code: args.code }
      );
    else return await command.error("ERROR_CONTACT_SUPPORT");
  }
}
