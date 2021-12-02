import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Permissions } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Starboard extends Command {
  constructor() {
    super("starboard", {
      description: (language: Language) =>
        language.get("STARBOARD_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      args: [
        {
          id: "action",
          type: "string",
          match: "phrase",
          required: false,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      group: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    return await this.sendDefaultMessage(command);
  }

  // this is no longer needed since slash commands w/subcommands cannot have the base command executed
  async sendDefaultMessage(command: ApplicationCommandMessage) {
    const embed = new MessageEmbed()
      .setColor(command.member?.displayColor ?? "#FFFFFF")
      .setTimestamp()
      .setDescription(command.language.get("STARBOARD_MAIN_DESCRIPTION"))
      .setAuthor({
        name: command.author.toString(),
        iconURL: command.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .addField(
        `${command.util.parsed?.prefix}starboard channel [<channel>]`,
        command.language.get("STARBOARD_CHANNEL_DESCRIPTION")
      )
      .addField(
        `${command.util.parsed?.prefix}starboard minimum <number>`,
        command.language.get("STARBOARD_MINIMUM_DESCRIPTION")
      )
      .addField(
        // for now, this will be a premium perk but I am open to changing it
        `${command.util.parsed?.prefix}starboard emoji [<emoji>]`,
        command.language.get("STARBOARD_EMOJI_DESCRIPTION")
      );
    return await command.channel.send({ embeds: [embed] });
  }
}
