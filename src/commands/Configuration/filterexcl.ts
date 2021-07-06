import { CategoryChannel, Permissions, Snowflake, Role } from "discord.js";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";

export default class FilterExclude extends Command {
  constructor() {
    super("filterexclude", {
      description: (language: Language) =>
        language.get("FILTEREXCL_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.MANAGE_MESSAGES,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      args: [
        {
          id: "toexclude",
          type: "member|role|channel|category",
          slashCommandType: "string",
          default: undefined,
          required: false,
        },
      ],
      aliases: ["filterwhitelist", "filterexcl"],
      enableSlashCommand: true,
      restrictTo: "guild",
      ephemeral: false,
    });
  }

  async exec(
    message: FireMessage,
    args: { toexclude?: FireMember | Role | FireTextChannel | CategoryChannel }
  ) {
    if (typeof args.toexclude == "undefined")
      return await this.sendCurrent(message);
    else if (!args.toexclude) return;
    let current = message.guild.settings.get<string[]>("excluded.filter", []);
    if (current.includes(args.toexclude.id))
      current = current.filter((id) => id != args.toexclude.id);
    else current.push(args.toexclude.id);
    if (current.length)
      await message.guild.settings.set<string[]>("excluded.filter", current);
    else await message.guild.settings.delete("excluded.filter");
    return await this.sendCurrent(message, true);
  }

  async sendCurrent(message: FireMessage, changed: boolean = false) {
    let mentions: { [key: string]: string } = {};
    let current = message.guild.settings.get<Snowflake[]>(
      "excluded.filter",
      []
    );
    for (const exclude of current) {
      if (message.guild.roles.cache.has(exclude))
        mentions[exclude] = message.guild.roles.cache.get(exclude).toString();
      if (
        message.guild.channels.cache
          .filter((channel) => channel.type == "text")
          .has(exclude)
      )
        mentions[exclude] = message.guild.channels.cache
          .get(exclude)
          .toString();
    }
    let mentionKeys = Object.keys(mentions);
    current = current.filter((id) => !mentionKeys.includes(id));
    const members = await message.guild.members.fetch({ user: current });
    for (const member of members.values())
      mentions[member.id] = (member as FireMember).toMention();
    mentionKeys = Object.keys(mentions);
    current = current.filter((id) => !mentionKeys.includes(id));
    if (current.length) {
      let excluded = message.guild.settings.get<Snowflake[]>(
        "excluded.filter",
        []
      );
      excluded = excluded.filter((id) => !current.includes(id));
      if (excluded.length)
        await message.guild.settings.set<string[]>("excluded.filter", excluded);
      else await message.guild.settings.delete("excluded.filter");
    }
    if (!changed)
      return await message.send(
        current.length
          ? mentions.length
            ? current.length == 1
              ? "FILTEREXCL_LIST_SOME_REMOVED_SINGLE"
              : "FILTEREXCL_LIST_SOME_REMOVED_MULTI"
            : "FILTEREXCL_REMOVE_RESET"
          : Object.keys(mentions).length == 1
          ? "FILTEREXCL_LIST_SINGLE"
          : mentions.length
          ? "FILTEREXCL_LIST_MULTI"
          : "FILTEREXCL_LIST_NONE",
        {
          mention: Object.values(mentions)[0],
          mentions: Object.values(mentions).join(", "),
          removed: current.join(", "),
        }
      );
    else
      return await message.success(
        (current.length
          ? mentions.length
            ? current.length == 1
              ? "FILTEREXCL_SET_SOME_REMOVED_SINGLE"
              : "FILTEREXCL_SET_SOME_REMOVED_MULTI"
            : "FILTEREXCL_REMOVE_RESET"
          : mentions.length
          ? "FILTEREXCL_SET"
          : "FILTEREXCL_RESET") as LanguageKeys,
        {
          mention: Object.values(mentions)[0],
          mentions: Object.values(mentions).join(", "),
          removed: current.join(", "),
        }
      );
  }
}
