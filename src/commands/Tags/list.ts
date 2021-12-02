import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { MessageEmbed, Permissions } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class TagList extends Command {
  constructor() {
    super("tag-list", {
      description: (language: Language) =>
        language.get("TAG_LIST_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      aliases: ["tags-list", "dtag-list", "dtags-list"],
      restrictTo: "guild",
      slashOnly: true,
      parent: "tag",
    });
  }

  async run(command: ApplicationCommandMessage) {
    if (!command.guild.tags) {
      command.guild.tags = new GuildTagManager(this.client, command.guild);
      await command.guild.tags.init();
    }
    const manager = command.guild.tags;
    const names = manager.names;
    if (!names.length) return await command.error("TAG_NONE_FOUND");
    const embed = new MessageEmbed()
      .setAuthor({
        name: command.language.get("TAG_LIST", { guild: command.guild.name }),
        iconURL: command.guild.iconURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setColor(command.member?.displayColor ?? "#FFFFFF")
      .setDescription(names.join(", "));
    return await command.channel.send({ embeds: [embed] });
  }
}
