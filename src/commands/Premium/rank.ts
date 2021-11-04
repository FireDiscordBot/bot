import {
  MessageSelectOptionData,
  MessageSelectMenu,
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
    const ranks: Snowflake[] = message.guild.settings
      .get<Snowflake[]>("utils.ranks", [])
      .filter((id) => message.guild.roles.cache.has(id));
    if (
      message.guild.settings.get<string[]>("utils.ranks", [])?.length !=
      ranks.length
    )
      message.guild.settings.set<string[]>("utils.ranks", ranks);
    if (!ranks.length) return await message.error("RANKS_NONE_FOUND");
    let roles = ranks.map((id: Snowflake) => message.guild.roles.cache.get(id));

    if (!args.role) {
      const isCached =
        message.guild.members.cache.size / message.guild.memberCount;
      const rankInfo = roles.map((role) =>
        isCached > 0.98
          ? message.language.get("RANKS_INFO", {
              role: role.toString(),
              members: role.members.size.toLocaleString(message.language.id),
            })
          : `> ${role}`
      );
      const embed = new MessageEmbed()
        .setColor(message.member?.displayColor ?? "#FFFFFF")
        .setTimestamp()
        .setAuthor(
          message.language.get("RANKS_AUTHOR", { guild: message.guild.name }),
          message.guild.icon
            ? (message.guild.iconURL({
                size: 2048,
                format: "png",
                dynamic: true,
              }) as string)
            : undefined
        );
      let components: MessageActionRow[];
      if (roles.length <= 5)
        components = Rank.getRankButtons(
          message.guild,
          message.member
          // message instanceof FireMessage
        );
      else if (roles.length <= 25)
        components = Rank.getRankDropdown(message.guild);
      if (components.length)
        return message.channel.send({ embeds: [embed], components });
      else return message.error("ERROR_CONTACT_SUPPORT");
    }

    if (
      roles.find(
        (role: Snowflake | Role) =>
          (role instanceof Role && role.id == args.role.id) ||
          role == args.role.id
      )
    ) {
      if (args.role.id == "595626786549792793")
        return await message.error("SK1ER_BETA_MOVED");
      message.member?.roles?.cache?.has(args.role.id)
        ? await message.member?.roles
            ?.remove(
              args.role,
              message.guild.language.get("RANKS_LEAVE_REASON")
            )
            .catch(() => {})
            .then(() =>
              message.success("RANKS_LEFT_RANK", { role: args.role.name })
            )
        : await message.member?.roles
            ?.add(args.role, message.guild.language.get("RANKS_JOIN_REASON"))
            .catch(() => {})
            .then(() =>
              message.success("RANKS_JOIN_RANK", { role: args.role.name })
            );
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
          .setCustomId(`!rank:${member?.id}:${role.id}`)
          .setLabel(name)
      );
      if (emoji) {
        const length = components[components.length - 1].components.length - 1;
        (
          components[components.length - 1].components[length] as MessageButton
        ).setEmoji(emoji);
      }
    }
    return components;
  }

  static getRankDropdown(guild: FireGuild) {
    let roles: Snowflake[] | Role[] = guild.settings
      .get<Snowflake[]>("utils.ranks", [])
      .filter((id) => guild.roles.cache.has(id));
    if (guild.settings.get<string[]>("utils.ranks", []) != roles)
      guild.settings.set<string[]>("utils.ranks", roles);
    if (!roles.length) return [];
    roles = roles.map((id) => guild.roles.cache.get(id) as Role);
    const dropdown = new MessageSelectMenu()
      .setPlaceholder(guild.language.get("RANKS_SELECT_PLACEHOLDER"))
      .setCustomId(`!rank:${guild.id}`)
      .setMaxValues(roles.length)
      .setMinValues(1);
    const options: MessageSelectOptionData[] = [];
    for (const role of roles) {
      if (dropdown.options.length >= 25) break;
      let name = "@" + role.name;
      let emoji: string;
      const hasEmoji = unicodeEmoji.exec(role.name);
      unicodeEmoji.lastIndex = 0;
      if (hasEmoji?.length && role.name.startsWith(hasEmoji[0])) {
        emoji = hasEmoji[0];
        name = "@" + role.name.slice(hasEmoji[0].length).trim();
      }
      options.push({
        emoji,
        default: false,
        value: role.id,
        label: name,
      });
    }
    dropdown.addOptions(options);
    return [new MessageActionRow().addComponents(dropdown)];
  }
}
