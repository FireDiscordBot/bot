import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { DiscordAPIError, Permissions } from "discord.js";
import * as centra from "centra";

const emojiRegex = constants.regexes.customEmoji;
const snowflakeRegex = /^(\d{15,21})$/gim;

export default class Steal extends Command {
  constructor() {
    super("steal", {
      description: (language: Language) =>
        language.get("STEAL_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS],
      args: [
        {
          id: "emoji",
          type: "string",
          readableType: "emoji/emoji id/emoji url",
          slashCommandType: "emoji",
          default: null,
          required: true,
        },
        {
          id: "name",
          type: "string",
          default: null,
          required: false,
        },
      ],
      enableSlashCommand: true,
      ephemeral: true,
    });
  }

  async exec(message: FireMessage, args: { emoji: string; name?: string }) {
    let emoji = args.emoji;
    let name = args.name || "stolen_emoji";
    if (!emoji) return await message.error("STEAL_NOTHING");
    if (snowflakeRegex.test(emoji.toString())) {
      snowflakeRegex.lastIndex = 0;
      emoji = `https://cdn.discordapp.com/emojis/${emoji}`;
      const format = await this.getFormat(emoji);
      if (!format) return await message.error("STEAL_INVALID_EMOJI");
      else emoji += format;
    } else if (emojiRegex.test(emoji)) {
      emojiRegex.lastIndex = 0;
      const match = emojiRegex.exec(emoji);
      emojiRegex.lastIndex = 0;
      emoji = `https://cdn.discordapp.com/emojis/${match.groups.id}.${
        match[0].startsWith("<a") ? "gif" : "png"
      }`;
      if (!args.name) name = match.groups.name;
    } else if (
      !/^https?:\/\/cdn\.discordapp\.com(\/emojis\/\d{15,21})\.\w{3,4}/im.test(
        emoji
      )
    )
      return await message.error("STEAL_INVALID_EMOJI");
    let created;
    try {
      created = await message.guild.emojis.create(emoji, name);
    } catch (e) {
      return await message.error("STEAL_CAUGHT", {
        code: e instanceof DiscordAPIError ? e.code : 0,
      });
    }
    return await message.success("STEAL_STOLEN", { emoji: created.toString() });
  }

  async getFormat(url: string) {
    const emojiReq = await centra(`${url}`, "HEAD")
      .header("User-Agent", this.client.manager.ua)
      .send();
    const contentType = emojiReq.headers["content-type"];
    if (!contentType || !contentType.includes("image/")) return null;
    else return contentType.split("/")[1];
  }
}
