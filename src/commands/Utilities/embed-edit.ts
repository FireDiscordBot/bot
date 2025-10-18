import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteractionOption,
} from "discord.js";
import Embed from "./embed";

export default class EmbedEdit extends Command {
  constructor() {
    super("embed-edit", {
      description: (language: Language) =>
        language.get("EMBED_EDIT_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "id",
          type: "string",
          description: (language: Language) =>
            language.get("EMBED_EDIT_ID_ARGUMENT_DESCRIPTION"),
          required: true,
          autocomplete: true,
          default: null,
        },
      ],
      restrictTo: "guild",
      slashOnly: true,
      parent: "embed",
    });
  }

  async autocomplete(
    interaction: ApplicationCommandMessage,
    _: CommandInteractionOption
  ): Promise<ApplicationCommandOptionChoiceData[] | string[]> {
    const embedIds = await this.client.db
      .query("SELECT id FROM embeds WHERE uid=$1", [interaction.author.id])
      .catch(() => {});
    if (!embedIds) return [];
    return embedIds.rows.map((r) => ({
      name: r[0],
      value: r[0],
    })) as ApplicationCommandOptionChoiceData[];
  }

  async run(command: ApplicationCommandMessage, args: { id?: string }) {
    const embed = await (this.parentCommand as Embed).getEmbed(
      args.id,
      command.language
    );
    if (!embed) return await command.error("EMBED_EDIT_ID_NOT_FOUND");
    else if (embed.createdBy != command.author.id)
      return await command.error("EMBED_EDIT_ID_NOT_YOURS");

    return await command.send("EMBED_BUILDER", {
      sendcmd: this.parentCommand.getSlashCommandMention(
        command.guild,
        this.client.getCommand("embed-send")
      ),
      id: args.id,
      embeds: [embed.embed],
      components: (this.parentCommand as Embed).getEmbedBuilderComponents(
        command,
        args.id,
        !!embed.embed.fields.length
      ),
    });
  }
}
