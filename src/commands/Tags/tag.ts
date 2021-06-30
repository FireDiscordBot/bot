import { DiscordAPIError, MessageEmbed, Permissions } from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Tag extends Command {
  constructor() {
    super("tag", {
      description: (language: Language) =>
        language.get("TAG_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      args: [
        {
          id: "tag",
          type: "string",
          default: null,
          required: false,
        },
      ],
      aliases: ["tags", "dtag", "dtags"],
      enableSlashCommand: true,
      restrictTo: "guild",
      group: true,
    });
  }

  async exec(message: FireMessage, args: { tag?: string }) {
    if (!args.tag) return await this.sendTagsList(message);
    else if (this.getChildren().includes(`tag-${args.tag.split(" ")[0]}`)) {
      message.content = message.content.replace(
        `${message.util?.parsed?.alias || "tag"} ${args.tag}`,
        `tag-${args.tag}`
      );
      return await this.client.commandHandler.handle(message);
    }
    if (["dtag", "dtags"].includes(message.util?.parsed?.alias.toLowerCase()))
      message.delete();
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(args.tag);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", args.tag);
    await manager.useTag(cachedTag.name);
    let referenced: FireMessage;
    if (message.type == "REPLY") {
      referenced = (await message.channel.messages
        .fetch(message.reference.messageID)
        .catch(() => {})) as FireMessage;
    }
    if (referenced)
      return await referenced
        .reply({
          allowedMentions: { repliedUser: true },
          content: cachedTag.content,
          failIfNotExists: false,
        })
        .catch(() => {});
    else return await message.channel.send({ content: cachedTag.content });
  }

  async sendTagsList(message: FireMessage) {
    const manager = message.guild.tags;
    const names = manager.cache.size ? manager.cache.keyArray() : manager.names;
    if (!names.length) return await message.error("TAG_NONE_FOUND");
    const embed = new MessageEmbed()
      .setAuthor(
        message.language.get("TAG_LIST", message.guild.name),
        message.guild.iconURL({ size: 2048, format: "png", dynamic: true })
      )
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setDescription(names.join(", "));
    return await message.channel.send({ embeds: [embed] });
  }
}
