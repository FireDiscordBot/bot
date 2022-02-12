import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { Language } from "@fire/lib/util/language";
import { MessageEmbed } from "discord.js";

export default class TagList extends Command {
  constructor() {
    super("tag-list", {
      description: (language: Language) =>
        language.get("TAG_LIST_COMMAND_DESCRIPTION"),
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
