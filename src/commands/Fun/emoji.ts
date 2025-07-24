import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import * as centra from "centra";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { DiscordAPIError, GuildEmoji } from "discord.js";

const snowflakeRegex = /^(\d{15,21})$/gim;

export default class Emoji extends Command {
  constructor() {
    super("emoji", {
      description: (language: Language) =>
        language.get("EMOJI_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageEmojisAndStickers,
      ],
      userPermissions: [PermissionFlagsBits.ManageEmojisAndStickers],
      args: [
        {
          id: "name",
          type: "string",
          default: null,
          required: true,
        },
        {
          id: "emoji",
          type: "string",
          readableType: "emoji/emoji id/emoji url",
          slashCommandType: "emoji",
          default: null,
          required: true,
        },
      ],
      enableSlashCommand: true,
      ephemeral: true,
      hidden: false,
    });
  }

  async exec(message: FireMessage, args: { name?: string; emoji?: string }) {
    let emoji = args.emoji || message.attachments.first()?.url || args.name;
    let name = args.name || "stolen_emoji";

    // smol checks on the arguments to ensure they're valid
    if (!emoji) return await message.error("EMOJI_INVALID");
    else if (name.length > 32) return await message.error("EMOJI_NAME_LONG");
    else if (name.length < 2) return await message.error("EMOJI_NAME_SHORT");

    if (snowflakeRegex.test(emoji.toString())) {
      this.resetIndexes();
      emoji = `https://cdn.discordapp.com/emojis/${emoji}`;
      const format = await this.getFormat(emoji);
      if (!format) return await message.error("EMOJI_INVALID");
      else emoji = `${emoji}.${format}`;
    } else if (constants.regexes.customEmoji.test(emoji)) {
      this.resetIndexes();
      const match = constants.regexes.customEmoji.exec(emoji);
      this.resetIndexes();
      emoji = `https://cdn.discordapp.com/emojis/${match.groups.id}.${
        match[0].startsWith("<a") ? "gif" : "png"
      }`;
      if (!args.name) name = match.groups.name;
    } else if (
      !constants.regexes.discord.cdnEmoji.test(emoji) &&
      !constants.regexes.discord.cdnAttachment.test(emoji)
    ) {
      this.resetIndexes();
      return await message.error("EMOJI_INVALID");
    }
    this.resetIndexes();
    if (constants.regexes.customEmoji.test(name)) {
      this.resetIndexes();
      const match = constants.regexes.customEmoji.exec(name);
      name = match.groups.name;
    }
    this.resetIndexes();
    if (
      !constants.imageExts.some(
        (ext) => emoji.split("?")[0].toLowerCase().endsWith(ext)
        // there is a chance for this to break if they change the "1"
        // but the likelihood of that happening is very low
      )
    )
      return await message.error("EMOJI_INVALID");
    let created: GuildEmoji;
    try {
      created = await message.guild.emojis.create(emoji, name);
    } catch (e) {
      return await message.error("EMOJI_ERROR", {
        code: e instanceof DiscordAPIError ? e.code : 0,
      });
    }
    return await message.success("EMOJI_UPLOADED", {
      emoji: created.toString(),
    });
  }

  async getFormat(url: string) {
    const emojiReq = await centra(url, "HEAD")
      .header("User-Agent", this.client.manager.ua)
      .send();
    const contentType = emojiReq.headers["content-type"];
    if (!contentType || !contentType.includes("image/")) return null;
    else return contentType.split("/")[1];
  }

  private resetIndexes() {
    constants.regexes.discord.cdnAttachment.lastIndex = 0;
    constants.regexes.discord.cdnEmoji.lastIndex = 0;
    constants.regexes.customEmoji.lastIndex = 0;
    snowflakeRegex.lastIndex = 0;
  }
}
