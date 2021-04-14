import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import Redirects from "@fire/src/modules/redirects";
import Filters from "@fire/src/modules/filters";
import { MessageEmbed } from "discord.js";

const deleteKeywords = ["remove", "delete", "true", "yeet", "disable"];
const validityRegex = /[a-zA-Z0-9]{2,25}/gim;

export default class Redirect extends Command {
  module: Redirects;

  constructor() {
    super("redirect", {
      description: (language: Language) =>
        language.get("REDIRECT_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "code",
          type: "string",
          required: false,
          default: null,
        },
        {
          id: "url",
          type: "string",
          required: false,
          match: "rest",
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage, args: { code?: string; url?: string }) {
    if (!this.module)
      this.module = this.client.getModule("redirects") as Redirects;

    if (!message.author.premium)
      return await message.error("COMMAND_PREMIUM_USER_ONLY");

    if (!args.code) {
      const current = await this.module.list(message.author);
      if (!current.length) return await message.error("REDIRECT_ARGS_REQUIRED");
      const embed = new MessageEmbed()
        .setColor(message.member?.displayHexColor || "#ffffff")
        .setTimestamp()
        .setAuthor(
          message.language.get("REDIRECT_LIST_AUTHOR"),
          message.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          })
        )
        .setDescription(
          message.language.get(
            "REDIRECT_LIST_DESCRIPTION",
            current,
            5 * message.author.premium - current.length,
            message.util?.parsed?.prefix
          )
        );
      return await message.channel.send(embed);
    } else if (!args.url) {
      const embed = await this.module.current(
        message.author,
        args.code,
        message.language
      );
      if (!embed) return await message.error("REDIRECT_NOT_FOUND");
      return await message.channel.send(embed);
    }

    if (deleteKeywords.includes(args.url)) {
      const deleted = await this.module.delete(args.code, message.author);
      return deleted ? await message.success() : await message.error();
    }

    if (!validityRegex.test(args.code) && !message.author.isSuperuser()) {
      validityRegex.lastIndex = 0;
      return await message.error("REDIRECT_REGEX_FAIL");
    }
    validityRegex.lastIndex = 0;

    const filters = this.client.getModule("filters") as Filters;

    let url: URL;
    try {
      url = new URL(args.url);
      if (url.protocol != "https:") throw new Error("protocol");
      else if (
        // you cannot use redirects for invites
        filters.regexes.discord.some((regex) => {
          const test = regex.test(url.href);
          regex.lastIndex = 0;
          return test;
        })
      )
        throw new Error("invite");
    } catch (e) {
      return await message.error("REDIRECT_URL_INVALID");
    }

    const created = await this.module.create(
      message.author,
      args.code,
      url.toString()
    );
    if (!created) return await message.error();

    if (typeof created == "string")
      return await message.error(`REDIRECT_ERROR_${created.toUpperCase()}`);

    return await message.success(
      "REDIRECT_CREATED",
      created.get("code"),
      created.get("redirect"),
      this.client.config.dev
    );
  }
}
