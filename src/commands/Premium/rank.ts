import {
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  Permissions,
  Snowflake,
  Role,
} from "discord.js";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

const {
  regexes: { unicodeEmoji },
} = constants;

export default class Rank extends Command {
  constructor() {
    super("rank", {
      description: (language: Language) =>
        language.get("RANK_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.MANAGE_ROLES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      restrictTo: "guild",
      args: [
        {
          id: "role",
          type: "roleSilent",
          readableType: "role",
          required: false,
          default: null,
        },
      ],
      aliases: [
        "ranks",
        "joinroles",
        "joinableroles",
        "selfroles",
        "selfranks",
      ],
      enableSlashCommand: true,
      ephemeral: true,
      premium: true,
    });
  }

  async exec(message: FireMessage, args: { role?: Role }) {
    let roles: Snowflake[] | Role[] | string[] = message.guild.settings
      .get<Snowflake[]>("utils.ranks", [])
      .filter((id) => message.guild.roles.cache.has(id));
    if (message.guild.settings.get<string[]>("utils.ranks", []) != roles)
      message.guild.settings.set<string[]>("utils.ranks", roles);
    if (!roles.length) return await message.error("RANKS_NONE_FOUND");
    roles = roles.map((id) => message.guild.roles.cache.get(id) as Role);

    if (!args.role) {
      const isCached =
        message.guild.members.cache.size / message.guild.memberCount;
      roles = roles.map((role) =>
        isCached > 0.98
          ? (message.language.get(
              "RANKS_INFO",
              role.toString(),
              role.members.size.toLocaleString(message.language.id)
            ) as string)
          : `> ${role}`
      );
      const embed = new MessageEmbed()
        .setColor(message.member?.displayHexColor || "#ffffff")
        .setTimestamp()
        .setDescription(roles.join("\n"))
        .setAuthor(
          message.language.get("RANKS_AUTHOR", message.guild.toString()),
          message.guild.icon
            ? (message.guild.iconURL({
                size: 2048,
                format: "png",
                dynamic: true,
              }) as string)
            : undefined
        );
      if (!message.hasExperiment(1621199146, 1))
        return await message.channel.send({ embed });
      else delete embed.description;
      const components = Rank.getRankButtons(
        message.guild,
        message.member
        // message instanceof FireMessage
      );
      return message.channel.send({ embed, components });
    }

    if (roles.includes(args.role)) {
      if (args.role.id == "595626786549792793")
        return await message.error("SK1ER_BETA_MOVED");
      message.member?.roles?.cache?.has(args.role.id)
        ? await message.member?.roles
            ?.remove(
              args.role,
              message.guild.language.get("RANKS_LEAVE_REASON")
            )
            .catch(() => {})
            .then(() => message.success("RANKS_LEFT_RANK", args.role.name))
        : await message.member?.roles
            ?.add(args.role, message.guild.language.get("RANKS_JOIN_REASON"))
            .catch(() => {})
            .then(() => message.success("RANKS_JOIN_RANK", args.role.name));
    } else return await message.error("RANKS_INVALID_ROLE");
  }

  static getRankButtons(
    guild: FireGuild,
    member: FireMember,
    useState: boolean = true
  ) {
    let roles: Snowflake[] | Role[] = guild.settings
      .get<Snowflake[]>("utils.ranks", [])
      .filter((id) => guild.roles.cache.has(id));
    if (guild.settings.get<Snowflake[]>("utils.ranks", []) != roles)
      guild.settings.set<Snowflake[]>("utils.ranks", roles);
    if (!roles.length) return [];
    roles = roles.map((id) => guild.roles.cache.get(id) as Role);
    const components = [new MessageActionRow()];
    for (const role of roles) {
      let name = "@" + role.name;
      let emoji: string;
      const hasEmoji = unicodeEmoji.exec(role.name);
      unicodeEmoji.lastIndex = 0;
      if (hasEmoji?.length && role.name.startsWith(hasEmoji[0])) {
        emoji = hasEmoji[0];
        name = "@" + role.name.slice(hasEmoji[0].length).trim();
      }
      if (
        components[components.length - 1].components.length >= 5 &&
        components.length < 5
      )
        components.push(new MessageActionRow());
      components[components.length - 1].addComponents(
        new MessageButton()
          .setStyle(
            useState
              ? member.roles.cache.has(role.id)
                ? "DANGER"
                : "SUCCESS"
              : "PRIMARY"
          )
          .setCustomID(`!rank:${member?.id}:${role.id}`)
          .setLabel(name)
      );
      if (emoji) {
        const length = components[components.length - 1].components.length - 1;
        components[components.length - 1].components[length].setEmoji(emoji);
      }
    }
    return components;
  }
}
