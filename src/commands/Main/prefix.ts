import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

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
      userPermissions: [PermissionFlagsBits.ManageGuild],
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
      aliases: ["prefixes"],
      restrictTo: "guild",
      lock: "guild",
    });
  }

  async exec(message: FireMessage, args: { action?: string; prefix?: string }) {
    args.prefix = args.prefix?.trim();
    let current = message.guild.settings.get<string[]>(
      "config.prefix",
      process.env.SPECIAL_PREFIX ? [process.env.SPECIAL_PREFIX] : ["$"]
    );
    if (!args.action)
      return message.util?.parsed?.alias == "prefixes"
        ? await message.send(
            current.length == 1
              ? "PREFIXES_CURRENT_SINGLE"
              : "PREFIXES_CURRENT_MULTI",
            {
              prefix: current[0],
              prefixes: current.join(", "),
            }
          )
        : await message.error("PREFIX_MISSING_ARG");
    if (validActions.list.includes(args.action) && !args.prefix)
      return await message.send(
        current.length == 1
          ? "PREFIXES_CURRENT_SINGLE"
          : "PREFIXES_CURRENT_MULTI",
        {
          prefix: current[0],
          prefixes: current.join(", "),
        }
      );
    if (process.env.SPECIAL_PREFIX)
      return await message.error("PREFIX_CHANGE_DISALLOWED", {
        special: process.env.SPECIAL_PREFIX,
      });
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
        else message.guild.settings.set<string[]>("config.prefix", current);
        return await message.success(
          current.length == 1 && current[0] == "$"
            ? "PREFIX_REMOVED_RESET"
            : current.length == 1
            ? "PREFIX_REMOVED_SINGLE"
            : "PREFIX_REMOVED_MULTI",
          {
            prefix: current[0],
            prefixes: current.join(", "),
          }
        );
      } else {
        const invalid = await this.testPrefix(message, args.action);
        if (invalid) return;
        if (current.length == 1 && current[0] == "$") current = []; // remove default
        if (
          current
            .map((prefix) => prefix.toLowerCase().trim())
            .includes(args.action.toLowerCase().trim())
        )
          return await message.error("PREFIX_ALREADY_HOW", {
            usedPrefix: message.util?.parsed?.prefix,
            toRemove: args.action,
          });
        current.push(args.action);
        if (current.length == 1 && current[0] == "$")
          message.guild.settings.delete("config.prefix");
        else
          message.guild.settings.set<string[]>(
            "config.prefix",
            current.filter((prefix) => !!prefix)
          );
        return await message.success(
          current.length == 1 ? "PREFIX_ADDED_SINGLE" : "PREFIX_ADDED_MULTI",
          {
            prefix: current[current.length - 1],
            prefixes: current.join(", "),
          }
        );
      }
    }
    if (validActions.add.includes(args.action)) {
      const invalid = await this.testPrefix(message, args.prefix);
      if (invalid) return;
      if (current.length == 1 && current[0] == "$") current = []; // remove default
      if (
        current
          .map((prefix) => prefix.toLowerCase().trim())
          .includes(args.prefix.toLowerCase().trim())
      )
        return await message.error("PREFIX_ALREADY_HOW", {
          usedPrefix: message.util?.parsed?.prefix,
          toRemove: args.action,
        });
      current.push(args.prefix);
      if (current.length == 1 && current[0] == "$")
        message.guild.settings.delete("config.prefix");
      else
        message.guild.settings.set<string[]>(
          "config.prefix",
          current.filter((prefix) => !!prefix)
        );
      return await message.success(
        current.length == 1 ? "PREFIX_ADDED_SINGLE" : "PREFIX_ADDED_MULTI",
        {
          prefix: current[current.length - 1],
          prefixes: current.join(", "),
        }
      );
    } else if (validActions.remove.includes(args.action.trim())) {
      if (!args.prefix)
        return await message.error("PREFIX_ACTION_WITHOUT_VALUE");
      // if (current.length == 1 && current[0].trim() == args.prefix?.trim())
      //   return await message.error("PREFIX_REMOVE_ONLY");
      if (current.map((prefix) => prefix.trim()).includes(args.prefix.trim())) {
        delete current[
          current.map((prefix) => prefix.trim()).indexOf(args.prefix.trim())
        ];
        current = current.filter((prefix) => !!prefix);
        if (!current.length) current.push("$");
        if (current.length == 1 && current[0] == "$")
          message.guild.settings.delete("config.prefix");
        else message.guild.settings.set<string[]>("config.prefix", current);
        return await message.success(
          current.length == 1 && current[0] == "$"
            ? "PREFIX_REMOVED_RESET"
            : current.length == 1
            ? "PREFIX_REMOVED_SINGLE"
            : "PREFIX_REMOVED_MULTI",
          {
            prefix: current[0],
            prefixes: current.join(", "),
          }
        );
      } else return await message.error("PREFIX_REMOVE_NEVER_WAS");
    }
  }

  private async testPrefix(message: FireMessage, prefix: string) {
    if (!prefix) return await message.error("PREFIX_ACTION_WITHOUT_VALUE");
    if (prefix.trim() == "fire") return await message.error("PREFIX_GLOBAL");
    if (prefix.startsWith("/"))
      return await message.error("PREFIX_SLASH_COMMANDS");
    if (prefix.includes("\\")) return await message.error("PREFIX_ESCAPED");
    const mentionIds = [
      ...message.mentions.channels.keys(),
      ...message.mentions.users.keys(),
      ...message.mentions.roles.keys(),
    ];
    if (
      message.mentions.everyone ||
      mentionIds.some((id) => prefix.includes(id))
    )
      return await message.error("PREFIX_MENTION");
    try {
      if (new URL(prefix)) return await message.error("PREFIX_URI");
    } catch {}
    if (allEmoji.test(prefix)) {
      allEmoji.lastIndex = 0;
      return await message.error("PREFIX_EMOJI");
    }
    allEmoji.lastIndex = 0;
    if (prefix.length >= 15) return await message.error("PREFIX_LENGTH");
  }
}
