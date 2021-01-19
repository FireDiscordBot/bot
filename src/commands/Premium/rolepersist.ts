import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { MessageEmbed, Role } from "discord.js";

export default class RolePersist extends Command {
  constructor() {
    super("rolepersist", {
      description: (language: Language) =>
        language.get("ROLEPERSIST_COMMAND_DESCRIPTION"),
      userPermissions: ["MANAGE_ROLES"],
      args: [
        {
          id: "user",
          type: "member",
          required: true,
          default: null,
        },
        {
          id: "role",
          type: "role",
          match: "rest",
          required: true,
          default: null,
        },
      ],
      aliases: ["rolepersists", "persistroles", "persistrole"],
      enableSlashCommand: true,
      restrictTo: "guild",
      premium: true,
    });
  }

  async exec(message: FireMessage, args: { user: FireMember; role: Role }) {
    if (!args.user || !args.role) return;
    if (
      args.role.managed ||
      args.role.rawPosition > message.guild.me.roles.highest.rawPosition ||
      args.role.id == message.guild.roles.everyone.id ||
      args.role.rawPosition > message.member.roles.highest.rawPosition
    )
      return await message.error("ROLEPERSIST_ROLE_INVALID");

    if (args.user.id == message.author.id)
      return await message.error("ROLEPERSIST_SELF");
    else if (
      args.user.roles.highest.rawPosition >
        message.member.roles.highest.rawPosition &&
      args.user.id != args.user.guild.ownerID
    )
      return await message.error("ROLEPERSIST_GOD");

    let roles: Role[];
    const existing = message.guild.persistedRoles.get(args.user.id);
    if (!existing || !existing.length) roles = [args.role];
    else
      roles = [
        ...existing
          .map((id) => message.guild.roles.cache.get(id))
          .filter((role) => !!role && role.id != args.role.id),
        args.role,
      ];

    const added = await this.client.db
      .query(
        existing
          ? "UPDATE rolepersists SET roles=$1 WHERE gid=$2 AND uid=$3;"
          : "INSERT INTO rolepersists (roles, gid, uid) VALUES ($1, $2, $3);",
        [roles.map((role) => role.id), message.guild.id, args.user.id]
      )
      .catch(() => {});
    if (added) {
      message.guild.persistedRoles.set(
        args.user.id,
        roles.map((role) => role.id)
      );
      await args.user.roles.add(roles).catch(() => {});
      await this.sendLog(args.user, roles, message.member).catch(() => {});
    }
    return added &&
      (added.status.startsWith("INSERT") || added.status.startsWith("UPDATE"))
      ? await message.success(
          "ROLEPERSIST_SUCCESS",
          args.user.toString(),
          roles.map((role) => role.toString())
        )
      : await message.error("ROLEPERSIST_FAILED");
  }

  async sendLog(member: FireMember, roles: Role[], moderator: FireMember) {
    await member.guild
      .createModLogEntry(
        member,
        moderator,
        "role_persist",
        member.guild.language.get(
          "ROLEPERSIST_MODLOG_REASON",
          roles.map((role) => role.name)
        ) as string
      )
      .catch(() => {});
    const embed = new MessageEmbed()
      .setTimestamp()
      .setColor(roles.length ? member.displayHexColor || "#2ECC71" : "#E74C3C")
      .setAuthor(
        member.guild.language.get("ROLEPERSIST_LOG_AUTHOR", member.toString()),
        member.user.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .addField(member.guild.language.get("MODERATOR"), moderator.toString())
      .setFooter(`${member.id} | ${moderator.id}`);
    if (roles.length)
      embed.addField(
        member.guild.language.get("ROLES"),
        roles.map((role) => role.toString()).join(" - ")
      );
    return await member.guild.modLog(embed, "role_persist").catch(() => {});
  }
}
