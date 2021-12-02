import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { FireMessage } from "@fire/lib/extensions/message";
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

  async exec(message: FireMessage) {
    if (!message.guild.tags) {
      message.guild.tags = new GuildTagManager(this.client, message.guild);
      await message.guild.tags.init();
    }
    const manager = message.guild.tags;
    const names = manager.names;
    if (!names.length) return await message.error("TAG_NONE_FOUND");
    const embed = new MessageEmbed()
      .setAuthor({
        name: message.language.get("TAG_LIST", { guild: message.guild.name }),
        iconURL: message.guild.iconURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setDescription(names.join(", "));
    return await message.channel.send({ embeds: [embed] });
  }
}
