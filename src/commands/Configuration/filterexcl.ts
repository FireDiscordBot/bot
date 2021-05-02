import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { CategoryChannel, Role } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class FilterExclude extends Command {
  constructor() {
    super("filterexclude", {
      description: (language: Language) =>
        language.get("FILTEREXCL_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "MANAGE_MESSAGES"],
      userPermissions: ["MANAGE_GUILD"],
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
    let current: string[] = message.guild.settings.get("excluded.filter", []);
    if (current.includes(args.toexclude.id))
      current = current.filter((id) => id != args.toexclude.id);
    else current.push(args.toexclude.id);
    await message.guild.settings.set("excluded.filter", current);
    return await this.sendCurrent(message, true);
  }

  async sendCurrent(message: FireMessage, changed: boolean = false) {
    let mentions: { [key: string]: string } = {};
    let current: string[] = message.guild.settings.get("excluded.filter", []);
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
      let excluded: string[] = message.guild.settings.get(
        "excluded.filter",
        []
      );
      excluded = excluded.filter((id) => !current.includes(id));
      await message.guild.settings.set("excluded.filter", excluded);
    }
    if (!changed)
      return await message.send(
        current.length ? "FILTEREXCL_LIST_SOME_REMOVED" : "FILTEREXCL_LIST",
        Object.values(mentions),
        current
      );
    else
      return await message.success(
        current.length ? "FILTEREXCL_SET_SOME_REMOVED" : "FILTEREXCL_SET",
        Object.values(mentions),
        current
      );
  }
}
