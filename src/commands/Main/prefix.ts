import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";
import { constants } from "@fire/lib/util/constants";

const validActions = {
  add: ["add", "new"],
  remove: ["remove", "delete", "yeet"],
  list: ["list"],
};
const actionNames = ["add", "new", "remove", "delete", "yeet", "list"];
const {
  regexes: { allEmoji },
} = constants;

export default class Prefix extends Command {
  constructor() {
    super("prefix", {
      description: (language: Language) =>
        language.get("PREFIX_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      args: [
        {
          id: "action", // if not a valid action, will be used as prefix
          type: "string",
          readableType: "add/remove/list OR prefix",
          slashCommandType: "action",
          required: true,
          default: null,
        },
        {
          id: "prefix", // only required if action is provided and valid
          type: "string",
          required: false,
          default: null,
        },
      ],
      enableSlashCommand: true,
      aliases: ["prefixes"],
      restrictTo: "guild",
      lock: "guild",
    });
  }

  async exec(message: FireMessage, args: { action?: string; prefix?: string }) {
    args.prefix = args.prefix?.trim();
    let current = message.guild.settings.get(
      "config.prefix",
      process.env.SPECIAL_PREFIX ? [process.env.SPECIAL_PREFIX] : ["$"]
    ) as string[];
    if (!args.action)
      return message.util?.parsed?.alias == "prefixes"
        ? await message.send("PREFIXES_CURRENT", current)
        : await message.error("PREFIX_MISSING_ARG");
    if (validActions.list.includes(args.action) && !args.prefix)
      return await message.send("PREFIXES_CURRENT", current);
    if (process.env.SPECIAL_PREFIX)
      return await message.error("PREFIX_CHANGE_DISALLOWED");
    if (!args.prefix && !actionNames.includes(args.action)) {
      if (
        current
          .map((prefix) => prefix.toLowerCase().trim())
          .includes(args.action?.toLowerCase()?.trim())
      ) {
        current = current.filter(
          (prefix) => !!prefix && prefix != args.action.toLowerCase().trim()
        );
        if (!current.length) current.push("$");
        if (current.length == 1 && current[0] == "$")
          message.guild.settings.delete("config.prefix");
        else message.guild.settings.set("config.prefix", current);
        return await message.success("PREFIX_REMOVED", current);
      } else {
        if (args.action.trim() == "fire")
          return await message.error("PREFIX_GLOBAL");
        if (current.length == 1 && current[0] == "$") current = []; // remove default
        if (
          current
            .map((prefix) => prefix.toLowerCase().trim())
            .includes(args.action.toLowerCase().trim())
        )
          return await message.error(
            "PREFIX_ALREADY_HOW",
            message.util?.parsed?.prefix,
            args.action
          );
        current.push(args.action);
        if (current.length == 1 && current[0] == "$")
          message.guild.settings.delete("config.prefix");
        else
          message.guild.settings.set(
            "config.prefix",
            current.filter((prefix) => !!prefix)
          );
        return await message.success("PREFIX_ADDED", current);
      }
    }
    if (validActions.add.includes(args.action)) {
      if (!args.prefix)
        return await message.error("PREFIX_ACTION_WITHOUT_VALUE");
      if (args.prefix.trim() == "fire")
        return await message.error("PREFIX_GLOBAL");
      if (args.prefix.startsWith("/"))
        return await message.error("PREFIX_SLASH_COMMANDS");
      if (args.prefix.includes("\\"))
        return await message.error("PREFIX_ESCAPED");
      const mentionIds = [
        ...message.mentions.channels.keyArray(),
        ...message.mentions.users.keyArray(),
        ...message.mentions.roles.keyArray(),
      ];
      if (
        message.mentions.everyone ||
        mentionIds.some((id) => args.prefix.includes(id))
      )
        return await message.error("PREFIX_MENTION");
      try {
        if (new URL(args.prefix)) return await message.error("PREFIX_URI");
      } catch {}
      if (allEmoji.test(args.prefix)) {
        allEmoji.lastIndex = 0;
        return await message.error("PREFIX_EMOJI");
      }
      allEmoji.lastIndex = 0;
      if (args.prefix.length >= 15) return await message.error("PREFIX_LENGTH");
      if (current.length == 1 && current[0] == "$") current = []; // remove default
      if (
        current
          .map((prefix) => prefix.toLowerCase().trim())
          .includes(args.prefix.toLowerCase().trim())
      )
        return await message.error(
          "PREFIX_ALREADY_HOW",
          message.util?.parsed?.prefix,
          args.prefix
        );
      current.push(args.prefix);
      if (current.length == 1 && current[0] == "$")
        message.guild.settings.delete("config.prefix");
      else
        message.guild.settings.set(
          "config.prefix",
          current.filter((prefix) => !!prefix)
        );
      return await message.success("PREFIX_ADDED", current);
    } else if (validActions.remove.includes(args.action.trim())) {
      if (!args.prefix)
        return await message.error("PREFIX_ACTION_WITHOUT_VALUE");
      // if (current.length == 1 && current[0].trim() == args.prefix?.trim())
      //   return await message.error("PREFIX_REMOVE_SINGLE");
      if (current.map((prefix) => prefix.trim()).includes(args.prefix.trim())) {
        delete current[
          current.map((prefix) => prefix.trim()).indexOf(args.prefix.trim())
        ];
        current = current.filter((prefix) => !!prefix);
        if (!current.length) current.push("$");
        if (current.length == 1 && current[0] == "$")
          message.guild.settings.delete("config.prefix");
        else message.guild.settings.set("config.prefix", current);
        return await message.success("PREFIX_REMOVE", current);
      } else return await message.error("PREFIX_REMOVE_NEVER_WAS");
    }
  }
}
