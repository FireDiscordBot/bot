import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { MessageEmbed } from "discord.js";
import { nanoid } from "nanoid";
import Embed from "./embed";

const BASE_EMBED_DESCRIPTION_KEY = "EMBED_CREATE_BASE_DESCRIPTION";

export default class EmbedCreate extends Command {
  constructor() {
    super("embed-create", {
      description: (language: Language) =>
        language.get("EMBED_CREATE_COMMAND_DESCRIPTION"),
      clientPermissions: [PermissionFlagsBits.EmbedLinks],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
      parent: "embed",
      args: [],
    });
  }

  async run(command: ApplicationCommandMessage) {
    const parent = this.parentCommand as Embed;

    const existingEmbeds = await this.client.db
      .query<{ count: bigint }>("SELECT count(id) FROM embeds WHERE uid=$1", [
        command.author.id,
      ])
      .first()
      .catch(() => ({ count: 0n }));
    if (
      command.author.premium
        ? existingEmbeds.count >= 10n
        : existingEmbeds.count >= 5n
    )
      return await command.error(
        command.author.premium
          ? "EMBED_CREATE_MAXIMUM_REACHED"
          : "EMBED_CREATE_MAXIMUM_REACHED_UPSELL"
      );

    // :wethinkbigbrain:
    const emptyEmbed = await this.client.db
      .query<{ id: string }>(
        "SELECT id FROM embeds WHERE uid=$1 AND embed ->> 'description' = $2",
        [command.author.id, BASE_EMBED_DESCRIPTION_KEY]
      )
      .first()
      .catch(() => {});
    if (emptyEmbed && emptyEmbed.id)
      return await command.error("EMBED_CREATE_EMPTY_EMBED_EXISTS", {
        id: emptyEmbed.id,
      });

    const id = nanoid();
    const base = new MessageEmbed().setDescription(BASE_EMBED_DESCRIPTION_KEY);
    const insertedEmpty = await this.client.db
      .query("INSERT INTO embeds (id, uid, embed) VALUES ($1, $2,$3)", [
        id,
        command.author.id,
        base.toJSON(),
      ])
      .catch(() => {});
    if (!insertedEmpty || !insertedEmpty.status.startsWith("INSERT"))
      return await command.error("EMBED_CREATE_FAILED_TO_CREATE");

    // we're guaranteed that the description is the base desc
    // so we can replace without checking
    base.setDescription(command.language.get(BASE_EMBED_DESCRIPTION_KEY));

    return await command.send("EMBED_BUILDER", {
      sendcmd: this.client
        .getCommand("embed")
        .getSlashCommandMention(
          command.guild,
          this.client.getCommand("embed-send")
        ),
      id,
      components: parent.getEmbedBuilderComponents(command, id, false),
      embeds: [base],
    });
  }
}
