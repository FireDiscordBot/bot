import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Command } from "@fire/lib/util/command";
import { ModLogTypes } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { MessageEmbed, Permissions, Role } from "discord.js";

export default class RolePersist extends Command {
  constructor() {
    super("rolepersist", {
      description: (language: Language) =>
        language.get("ROLEPERSIST_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_ROLES],
      args: [
        {
          id: "user",
          type: "member",
          required: true,
          description: (language: Language) =>
            language.get("ROLEPERSIST_ARGUMENT_USER_DESCRIPTION"),
          default: undefined,
        },
        {
          id: "role",
          type: "role",
          match: "rest",
          required: true,
          description: (language: Language) =>
            language.get("ROLEPERSIST_ARGUMENT_ROLE_DESCRIPTION"),
          default: undefined,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      ephemeral: true,
      premium: true,
    });
  }

  async run(
    message: ApplicationCommandMessage,
    args: { user: FireMember; role: Role }
  ) {
    if (
      args.role &&
      (args.role.managed ||
        args.role.rawPosition >=
          message.guild.members.me.roles.highest.rawPosition ||
        args.role.id == message.guild.roles.everyone.id ||
        (args.role.rawPosition >= message.member.roles.highest.rawPosition &&
          message.guild.ownerId != message.author.id))
    )
      return await message.error("ERROR_ROLE_UNUSABLE");

    if (args.user.id == message.author.id)
      return await message.error("ROLEPERSIST_SELF");
    else if (
      args.user.roles.highest.rawPosition >=
        message.member.roles.highest.rawPosition &&
      args.user.id != args.user.guild.ownerId
    )
      return await message.error("ROLEPERSIST_GOD");

    let roles: Role[];
    if (!message.guild.persistedRoles) await message.guild.loadPersistedRoles();
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
      await args.user.roles
        .add(roles, message.guild.language.get("ROLEPERSIST_REASON"))
        .catch(() => {});
      await this.sendLog(args.user, roles, message.member).catch(() => {});
    }
    return added &&
      (added.status.startsWith("INSERT") || added.status.startsWith("UPDATE"))
      ? await message.success(
          roles.length ? "ROLEPERSIST_SUCCESS" : "ROLEPERSIST_REMOVED",
          {
            member: args.user.toString(),
            roles: roles.map((role) => role.toString()).join(", "),
          }
        )
      : await message.error("ROLEPERSIST_FAILED");
  }

  async sendLog(member: FireMember, roles: Role[], moderator: FireMember) {
    await member.guild
      .createModLogEntry(
        member,
        moderator,
        ModLogTypes.ROLE_PERSIST,
        member.guild.language.get(
          roles.length
            ? "ROLEPERSIST_MODLOG_REASON"
            : "ROLEPERSIST_REMOVE_MODLOG_REASON",
          { roles: roles.map((role) => role.name).join(", ") }
        ) as string
      )
      .catch(() => {});
    const embed = new MessageEmbed()
      .setTimestamp()
      .setColor(roles.length ? member.displayColor || "#2ECC71" : "#E74C3C")
      .setAuthor({
        name: member.guild.language.get("ROLEPERSIST_LOG_AUTHOR", {
          member: member.display,
        }),
        iconURL: member.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .addField(member.guild.language.get("MODERATOR"), moderator.toString())
      .setFooter(`${member.id} | ${moderator.id}`);
    if (roles.length)
      embed.addField(
        member.guild.language.get("ROLES"),
        roles.map((role) => role.toString()).join(" - ")
      );
    return await member.guild
      .modLog(embed, ModLogTypes.ROLE_PERSIST)
      .catch(() => {});
  }
}
