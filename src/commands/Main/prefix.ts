import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

const validActions = {
  add: ["add", "new"],
  remove: ["remove", "delete"],
  list: ["list"],
};
const actionNames = ["add", "new", "remove", "delete", "list"];

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
      aliases: ["prefixes"],
      restrictTo: "guild",
      lock: "guild",
    });
  }

  async exec(message: FireMessage, args: { action?: string; prefix?: string }) {
    args.prefix = args.prefix?.trim();
    let current = message.guild.settings.get("config.prefix", [
      "$",
    ]) as string[];
    if (!args.action)
      return message.util?.parsed?.alias == "prefixes"
        ? await message.send("PREFIXES_CURRENT", current)
        : await message.error("PREFIX_MISSING_ARG");
    if (validActions.list.includes(args.action) && !args.prefix)
      return await message.send("PREFIXES_CURRENT", current);
    if (!args.prefix && !actionNames.includes(args.action)) {
      if (
        current.map((prefix) => prefix.trim()).includes(args.action?.trim())
      ) {
        delete current[
          current.map((prefix) => prefix.trim()).indexOf(args.action.trim())
        ];
        current = current.filter((prefix) => !!prefix);
        if (!current.length) current.push("$");
        if (current.length == 1 && current[0] == "$")
          message.guild.settings.delete("config.prefix");
        else message.guild.settings.set("config.prefix", current);
        return await message.success("PREFIX_REMOVED", current);
      } else {
        if (args.action.trim() == "fire")
          return await message.error("PREFIX_GLOBAL");
        if (current.length == 1 && current[0] == "$") current = []; // remove default
        if (current.map((prefix) => prefix.trim()).includes(args.action.trim()))
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
