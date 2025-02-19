import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import VanityURLs from "@fire/src/modules/vanityurls";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteractionOption,
  MessageEmbed,
} from "discord.js";

export default class VanityView extends Command {
  module: VanityURLs;

  constructor() {
    super("vanity-view", {
      description: (language: Language) =>
        language.get("VANITY_VIEW_COMMAND_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageGuild],
      args: [
        {
          id: "code",
          type: "string",
          slashCommandType: "code",
          description: (language: Language) =>
            language.get("VANITY_VIEW_CODE_ARGUMENT_DESCRIPTION"),
          autocomplete: true,
          required: true,
          default: null,
        },
      ],
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
        ? "SELECT code FROM vanity WHERE gid=$1 AND code ILIKE $2 LIMIT 25;"
        : "SELECT code FROM vanity WHERE gid=$1 LIMIT 25;",
      focusedValue
        ? [interaction.guild.id, `%${focusedValue}%`]
        : [interaction.guild.id]
    );
    if (!vanityResult.rows.length) return [];
    const vanities: ApplicationCommandOptionChoiceData[] = [];
    for await (const vanity of vanityResult) {
      const code = vanity.get("code") as string;
      vanities.push({
        name: code,
        value: code,
      });
    }
    return vanities;
  }

  async run(command: ApplicationCommandMessage, args: { code: string }) {
    if (!args.code) return await command.error("VANITY_VIEW_CODE_REQUIRED");

    if (!this.module)
      this.module = this.client.getModule("vanityurls") as VanityURLs;

    const current = await this.module
      .current(command.guild, args.code, command.language)
      .catch((e) => e);
    if (current instanceof Error)
      return await command.error(current.message as LanguageKeys);
    else if (current instanceof MessageEmbed)
      return await command.channel.send({
        embeds: [current],
      });
    else return await command.error("ERROR_CONTACT_SUPPORT");
  }
}
