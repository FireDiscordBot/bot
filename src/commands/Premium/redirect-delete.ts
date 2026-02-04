import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import Redirects from "@fire/src/modules/redirects";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteractionOption,
} from "discord.js";

export default class RedirectDelete extends Command {
  module: Redirects;

  constructor() {
    super("redirect-delete", {
      description: (language: Language) =>
        language.get("REDIRECT_DELETE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "code",
          type: "string",
          slashCommandType: "code",
          description: (language: Language) =>
            language.get("REDIRECT_DELETE_CODE_ARGUMENT_DESCRIPTION"),
          autocomplete: true,
          required: true,
          default: null,
        },
      ],
      parent: "redirect",
      slashOnly: true,
    });
  }

  async autocomplete(
    interaction: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ): Promise<ApplicationCommandOptionChoiceData[] | string[]> {
    const focusedValue = focused.value?.toString();
    const redirectResult = await this.client.db.query<{
      code: string;
      redirect: string;
    }>(
      focusedValue
        ? "SELECT code, redirect FROM vanity WHERE uid=$1 AND code ILIKE $2 AND redirect IS NOT NULL LIMIT 25;"
        : "SELECT code, redirect FROM vanity WHERE uid=$1 AND redirect IS NOT NULL LIMIT 25;",
      focusedValue
        ? [interaction.author.id, `%${focusedValue}%`]
        : [interaction.author.id]
    );
    if (!redirectResult.rows.length) return [];
    const vanities: ApplicationCommandOptionChoiceData[] = [];
    for await (const vanity of redirectResult) {
      const code = vanity.code,
        redirect = vanity.redirect;
      vanities.push({
        name: this.client.util.shortenText(`${code} - ${redirect}`, 100),
        value: code,
      });
    }
    return vanities;
  }

  async run(command: ApplicationCommandMessage, args: { code: string }) {
    if (!args.code) return await command.error("REDIRECT_DELETE_CODE_REQUIRED");

    if (!this.module)
      this.module = this.client.getModule("redirects") as Redirects;

    const existing = await this.module.getRedirect(args.code);
    if (!existing) return await command.error("REDIRECT_DELETE_CODE_NOT_FOUND");
    else if (typeof existing == "boolean")
      return await command.error("ERROR_CONTACT_SUPPORT");
    else if (existing.uid != command.author.id)
      return await command.error("REDIRECT_DELETE_CODE_NOT_YOURS");

    const deleted = await this.module.delete(args.code, command.author);
    if (deleted)
      return await command.success("REDIRECT_DELETE_SUCCESS", {
        code: args.code,
      });
    else return await command.error("ERROR_CONTACT_SUPPORT");
  }
}
