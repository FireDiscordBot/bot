import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import Redirects from "@fire/src/modules/redirects";
import { Command } from "@fire/lib/util/command";
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
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { code?: string; url?: string }
  ) {
    if (!this.module)
      this.module = this.client.getModule("redirects") as Redirects;

    if (!command.author.premium)
      return await command.error("COMMAND_PREMIUM_USER_ONLY");

    if (!args.code) {
      const current = await this.module.list(command.author);
      if (!current.length) return await command.error("REDIRECT_ARGS_REQUIRED");
      const embed = new MessageEmbed()
        .setColor(command.member?.displayColor ?? "#FFFFFF")
        .setTimestamp()
        .setAuthor(
          command.language.get("REDIRECT_LIST_AUTHOR"),
          command.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          })
        )
        .setDescription(
          command.language.get("REDIRECT_LIST_DESCRIPTION", {
            codes: current.join(", "),
            remaining: command.author.isSuperuser()
              ? 1_337_420.69
              : 5 * command.author.premium - current.length,
            prefix: command.util?.parsed?.prefix,
          })
        );
      return await command.channel.send({ embeds: [embed] });
    } else if (!args.url) {
      const embed = await this.module.current(
        command.author,
        args.code,
        command.language
      );
      if (!embed) return await command.error("REDIRECT_NOT_FOUND");
      return await command.channel.send({ embeds: [embed] });
    }

    if (deleteKeywords.includes(args.url)) {
      const deleted = await this.module.delete(args.code, command.author);
      return deleted
        ? await command.success("REDIRECT_DELETED")
        : await command.error("ERROR_CONTACT_SUPPORT");
    }

    if (!validityRegex.test(args.code) && !command.author.isSuperuser()) {
      validityRegex.lastIndex = 0;
      return await command.error("REDIRECT_REGEX_FAIL");
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
      return await command.error("REDIRECT_URL_INVALID");
    }

    const created = await this.module.create(
      command.author,
      args.code,
      url.toString()
    );
    if (!created) return await command.error("ERROR_CONTACT_SUPPORT");

    if (typeof created == "string")
      return await command.error(
        `REDIRECT_ERROR_${created.toUpperCase()}` as LanguageKeys
      );

    return await command.success("REDIRECT_CREATED", {
      redirect: `https://${
        process.env.NODE_ENV == "production" ? "" : "test."
      }inv.wtf/${created.get("code")}`,
      url: created.get("redirect"),
    });
  }
}
