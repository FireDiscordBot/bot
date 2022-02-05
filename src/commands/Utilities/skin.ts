import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { MessageEmbed } from "discord.js";

export default class Skin extends Command {
  constructor() {
    super("minecraft-skin", {
      description: (language: Language) =>
        language.get("MINECRAFT_SKIN_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "ign",
          type: /\w{1,16}/im,
          readableType: "ign",
          default: null,
          required: true,
        },
      ],
      enableSlashCommand: false,
      parent: "minecraft",
      restrictTo: "all",
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { ign?: { match: RegExpMatchArray; matches: RegExpExecArray[] } }
  ) {
    if (!args.ign) return await command.error("MINECRAFT_SKIN_INVALID_IGN");
    const ign: string = args.ign.match[0];
    let uuid = await this.client.util.nameToUUID(ign);
    if (!uuid) return await command.error("MINECRAFT_UUID_FETCH_FAIL");
    const embed = new MessageEmbed()
      .setColor(command.member?.displayColor ?? "#FFFFFF")
      .setImage(
        `https://visage.surgeplay.com/full/512/${uuid}?ts=${+new Date()}`
      )
      .setFooter(
        `Requested by ${command.author}`,
        command.author.displayAvatarURL({ size: 2048, dynamic: true })
      );
    return await command.channel.send({ embeds: [embed] });
  }
}
