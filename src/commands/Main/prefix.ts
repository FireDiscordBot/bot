import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

const validActions = {
  add: ["add", "+", "new"],
  remove: ["remove", "-", "delete"],
  list: ["list", "~"],
  useAsPrefix: ["+", "-", "~"],
};

export default class Prefix extends Command {
  constructor() {
    super("prefix", {
      description: (language: Language) =>
        language.get("PREFIX_COMMAND_DESCRIPTION"),
      userPermissions: ["MANAGE_GUILD"],
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
      restrictTo: "guild",
      lock: "guild",
    });
  }

  async exec(message: FireMessage, args: { action?: string; prefix?: string }) {
    args.prefix = args.prefix?.trim();
    if (!args.action) return await message.error("PREFIX_MISSING_ARG");
    let current = message.guild.settings.get("config.prefix", [
      "$",
    ]) as string[];
    if (!args.prefix) {
      if (
        (validActions.add.includes(args.prefix) ||
          validActions.remove.includes(args.prefix) ||
          validActions.list.includes(args.prefix)) &&
        !validActions.useAsPrefix.includes(args.prefix)
      )
        return await message.error("PREFIX_VALUE_DISALLOWED");
      if (current.map((prefix) => prefix.trim()).includes(args.prefix.trim())) {
        delete current[
          current.map((prefix) => prefix.trim()).indexOf(args.prefix.trim())
        ];
        if (!current.length) current.push("$");
        if (current.length == 1 && current[0] == "$")
          message.guild.settings.delete("config.prefix");
        else
          message.guild.settings.set(
            "config.prefix",
            current.filter((prefix) => !!prefix)
          );
        return await message.success("PREFIX_REMOVED", current);
      } else {
        if (args.prefix.trim() == "fire")
          return await message.error("PREFIX_GLOBAL");
        if (current.length == 1 && current[0] == "$") current = []; // remove default
        if (current.map((prefix) => prefix.trim()).includes(args.prefix.trim()))
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
      }
    }
    if (validActions.list.includes(args.action))
      return await message.send("PREFIXES_CURRENT", current);
    else if (validActions.add.includes(args.action)) {
      if (
        !args.prefix &&
        !validActions.useAsPrefix.includes(args.action.trim())
      )
        return await message.error("PREFIX_ACTION_WITHOUT_VALUE");
      if (args.prefix.trim() == "fire")
        return await message.error("PREFIX_GLOBAL");
      if (current.length == 1 && current[0] == "$") current = []; // remove default
      if (current.map((prefix) => prefix.trim()).includes(args.prefix.trim()))
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
      if (
        !args.prefix &&
        !validActions.useAsPrefix.includes(args.action.trim())
      )
        return await message.error("PREFIX_ACTION_WITHOUT_VALUE");
      if (current.length == 1 && current[0].trim() == args.prefix?.trim())
        return await message.error("PREFIX_REMOVE_SINGLE");
      if (current.map((prefix) => prefix.trim()).includes(args.prefix.trim())) {
        delete current[
          current.map((prefix) => prefix.trim()).indexOf(args.prefix.trim())
        ];
        if (!current.length) current.push("$");
        if (current.length == 1 && current[0] == "$")
          message.guild.settings.delete("config.prefix");
        else
          message.guild.settings.set(
            "config.prefix",
            current.filter((prefix) => !!prefix)
          );
        return await message.success("PREFIX_REMOVED", current);
      } else return await message.error("PREFIX_REMOVE_NEVER_WAS");
    }
  }
}
