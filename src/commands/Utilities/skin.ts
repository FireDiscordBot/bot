import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ProfileNotFoundError } from "@fire/lib/util/clientutil";
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
          id: "username",
          type: /\w{1,16}/im,
          readableType: "username",
          description: (language: Language) =>
            language.get("MINECRAFT_SKIN_ARGUMENT_USERNAME_DESCRIPTION"),
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
    if (!args.ign) return await command.error("MINECRAFT_INVALID_IGN");
    const ign: string = args.ign.match[0];
    let profile = await this.client.util.mcProfile(ign).catch(() => null);
    if (profile instanceof ProfileNotFoundError)
      return await command.error("MINECRAFT_PROFILE_FETCH_UNKNOWN");
    const embed = new MessageEmbed()
      .setColor(command.member?.displayColor || "#FFFFFF")
      .setImage(
        `https://visage.surgeplay.com/full/512/${profile}?ts=${+new Date()}`
      )
      .setFooter(
        `Requested by ${command.author}`,
        command.author.displayAvatarURL({ size: 2048, dynamic: true })
      );
    return await command.channel.send({ embeds: [embed] });
  }
}
