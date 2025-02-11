import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import Redirects from "@fire/src/modules/redirects";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteractionOption,
  MessageEmbed,
} from "discord.js";

export default class RedirectView extends Command {
  module: Redirects;

  constructor() {
    super("redirect-view", {
      description: (language: Language) =>
        language.get("REDIRECT_VIEW_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "code",
          type: "string",
          slashCommandType: "code",
          description: (language: Language) =>
            language.get("REDIRECT_VIEW_CODE_ARGUMENT_DESCRIPTION"),
          autocomplete: true,
          required: true,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      parent: "redirect",
      slashOnly: true,
    });
  }

  async autocomplete(
    interaction: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ): Promise<ApplicationCommandOptionChoiceData[] | string[]> {
    const focusedValue = focused.value?.toString();
    const redirectResult = await this.client.db.query(
      focusedValue
        ? "SELECT code FROM vanity WHERE uid=$1 AND code ILIKE $2 AND redirect IS NOT NULL LIMIT 25;"
        : "SELECT code FROM vanity WHERE uid=$1 AND redirect IS NOT NULL LIMIT 25;",
      focusedValue
        ? [interaction.author.id, `%${focusedValue}%`]
        : [interaction.author.id]
    );
    if (!redirectResult.rows.length) return [];
    const vanities: ApplicationCommandOptionChoiceData[] = [];
    for await (const vanity of redirectResult) {
      const code = vanity.get("code") as string;
      vanities.push({
        name: code,
        value: code,
      });
    }
    return vanities;
  }

  async run(command: ApplicationCommandMessage, args: { code: string }) {
    if (!args.code) return await command.error("REDIRECT_VIEW_CODE_REQUIRED");

    if (!this.module)
      this.module = this.client.getModule("redirects") as Redirects;

    const current = (await this.module
      .current(command.author, args.code, command.language)
      .catch((e) => e)) as Error | MessageEmbed;
    if (current instanceof Error)
      return await command.error(current.message as LanguageKeys);
    else if (current instanceof MessageEmbed)
      return await command.channel.send({
        embeds: [current],
      });
    else return await command.error("ERROR_CONTACT_SUPPORT");
  }
}
