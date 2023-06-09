import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { LinkfilterExcluded } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { MessageEmbed } from "discord.js";

export default class LinkfilterListExclude extends Command {
  constructor() {
    super("linkfilter-list-exclude", {
      description: (language: Language) =>
        language.get("LINKFILTER_LIST_EXCLUDE_COMMAND_DESCRIPTION"),
      args: [],
      enableSlashCommand: true,
      parent: "linkfilter",
      moderatorOnly: true,
      restrictTo: "guild",
      slashOnly: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    const current = command.guild.settings.get<LinkfilterExcluded>(
      "linkfilter.exclude",
      []
    );
    if (!current.length)
      return await command.error("LINKFILTER_LIST_EXCLUDE_NOTHING");
    const embed = new MessageEmbed()
      .setAuthor({
        name: command.guild.name,
        iconURL: command.guild.iconURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setColor(command.member?.displayColor || "#FFFFFF")
      .setFooter(command.guildId);
    const roles = current
      .filter((i) => i.startsWith("role:"))
      .map((r) => command.guild.roles.cache.get(r.slice(5)).name);
    const channels = current
      .filter((i) => i.startsWith("channel:"))
      .map((c) => command.guild.channels.cache.get(c.slice(8)).name);
    const userIds = current
      .filter((i) => i.startsWith("user:"))
      .map((u) => u.slice(5));
    const members = await command.guild.members
      .fetch({ user: userIds })
      .catch(() => {});
    if (roles.length)
      embed.addField(command.language.get("ROLES"), roles.join(", "));
    if (channels.length)
      embed.addField(command.language.get("CHANNELS"), channels.join(", "));
    if (members && members.size)
      embed.addField(
        command.language.get("MEMBERS"),
        members.map((m) => m.toString()).join(", ")
      );
    return await command.channel.send({ embeds: [embed] });
  }
}
