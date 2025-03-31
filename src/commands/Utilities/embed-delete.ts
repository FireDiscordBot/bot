import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteractionOption,
  MessageActionRow,
  MessageButton,
} from "discord.js";
import Embed from "./embed";

export default class EmbedDelete extends Command {
  constructor() {
    super("embed-delete", {
      description: (language: Language) =>
        language.get("EMBED_DELETE_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "id",
          type: "string",
          description: (language: Language) =>
            language.get("EMBED_DELETE_ID_ARGUMENT_DESCRIPTION"),
          required: true,
          autocomplete: true,
          default: null,
        },
      ],
      restrictTo: "guild",
      slashOnly: true,
      ephemeral: true,
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
    const embed = await (this.parentCommand as Embed).getEmbed(args.id);
    if (!embed) return await command.error("EMBED_DELETE_ID_NOT_FOUND");
    else if (embed.createdBy != command.author.id)
      return await command.error("EMBED_DELETE_ID_NOT_YOURS");

    const confirmButton = new MessageButton()
      .setStyle("DANGER")
      .setCustomId(`!embed-delete-confirm:${args.id}`)
      .setLabel(command.language.get("EMBED_DELETE_CONFIRM_BUTTON_LABEL"));
    const row = new MessageActionRow().addComponents(confirmButton);

    return await command.send("EMBED_DELETE_PROMPT", {
      embeds: [embed.embed],
      components: [row],
    });
  }
}
