import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v10";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteractionOption,
  DMChannel,
} from "discord.js";
import Embed from "./embed";

export default class EmbedSend extends Command {
  constructor() {
    super("embed-send", {
      description: (language: Language) =>
        language.get("EMBED_SEND_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "id",
          type: "string",
          description: (language: Language) =>
            language.get("EMBED_SEND_ID_ARGUMENT_DESCRIPTION"),
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
      .query<{
        id: string;
      }>("SELECT id FROM embeds WHERE uid=$1", [interaction.author.id])
      .catch(() => {});
    if (!embedIds) return [];
    return embedIds.rows.map((r) => ({
      name: r[0],
      value: r[0],
    })) as ApplicationCommandOptionChoiceData[];
  }

  async run(command: ApplicationCommandMessage, args: { id?: string }) {
    const channel = command.channel.real;
    if (!channel.isText() || channel instanceof DMChannel)
      return await command.error("EMBED_SEND_CHANNEL_INVALID");

    const requiredPermissions = [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ];
    if (channel.isThread())
      requiredPermissions.push(PermissionFlagsBits.SendMessagesInThreads);
    const meHasPermission = command.guild.members.me
      .permissionsIn(channel)
      .has(requiredPermissions);
    const userHasPermission = command.member
      .permissionsIn(channel)
      .has(requiredPermissions);

    if (!meHasPermission)
      return this.client.commandHandler.emit(
        "missingPermissions",
        command,
        this,
        "client",
        command.guild.members.me
          ?.permissionsIn(channel)
          .missing(requiredPermissions)
      );
    else if (!userHasPermission)
      return this.client.commandHandler.emit(
        "missingPermissions",
        command,
        this,
        "user",
        command.member.permissionsIn(channel).missing(requiredPermissions)
      );

    const embed = await (this.parentCommand as Embed).getEmbed(
      args.id,
      command.language
    );
    if (!embed) return await command.error("EMBED_SEND_ID_NOT_FOUND");

    const canManage = command.member
      .permissionsIn(channel)
      .has(PermissionFlagsBits.ManageMessages);

    await channel.send({
      content: canManage
        ? null
        : command.guild.language.get("EMBED_SEND_SENT_BY", {
            user: command.member.toString(),
            id: command.member.id,
            command: this.parentCommand.getSlashCommandMention(
              command.guild,
              this
            ),
          }),
      embeds: [embed.embed],
    });
    return await command.success(
      canManage ? "EMBED_SEND_SUCCESS" : "EMBED_SEND_SUCCESS_MISSING_MANAGE",
      {
        channel: channel.toString(),
        id: args.id,
      }
    );
  }
}
