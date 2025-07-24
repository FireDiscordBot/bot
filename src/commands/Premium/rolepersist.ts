import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Command } from "@fire/lib/util/command";
import { ModLogTypes, ModLogTypeString } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { MessageEmbed, Role } from "discord.js";

// TODO: create modlog entry first, block if failed
// this is the vehavior moderation commands follow
// and even though this is in the premium category
// it should still be treated as one

// also needs a general code cleanup too but effort

export default class RolePersist extends Command {
  constructor() {
    super("rolepersist", {
      description: (language: Language) =>
        language.get("ROLEPERSIST_COMMAND_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageRoles],
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
        {
          id: "reason",
          type: "string",
          description: (language: Language) =>
            language.get("ROLEPERSIST_ARGUMENT_REASON_DESCRIPTION"),
          required: false,
          default: null,
          match: "rest",
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
    args: { user: FireMember; role: Role; reason?: string }
  ) {
    if (!args.user) return await message.error("ROLEPERSIST_MISSING_USER");

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
      await this.sendLog(
        args.user,
        roles,
        message.member,
        args.reason ??
          message.guild.language.get("MODERATOR_ACTION_DEFAULT_REASON")
      ).catch(() => {});
    }
    const stats = await args.user.getModLogStats();
    const nonZeroTypes = Object.entries(stats)
      .filter(([type, count]) => count > 0 && type != "role_persist")
      .map(([type, count]: [ModLogTypeString, number]) =>
        message.guild.language.get("MODLOGS_ACTION_LINE", {
          action: type,
          count,
        })
      )
      .join("\n");
    return added &&
      (added.status.startsWith("INSERT") || added.status.startsWith("UPDATE"))
      ? (await message.channel.send(
          message.guild.language.getSuccess(
            roles.length ? "ROLEPERSIST_SUCCESS" : "ROLEPERSIST_REMOVED",
            {
              member: args.user.toString(),
              roles: roles.map((role) => role.toString()).join(", "),
            }
          )
        )) +
          (nonZeroTypes
            ? `\n\n${message.guild.language.get("MODLOGS_ACTION_FOOTER", {
                entries: nonZeroTypes,
              })}`
            : "")
      : await message.error("ROLEPERSIST_FAILED");
  }

  async sendLog(
    member: FireMember,
    roles: Role[],
    moderator: FireMember,
    reason: string
  ) {
    await member.guild
      .createModLogEntry(member, moderator, ModLogTypes.ROLE_PERSIST, reason)
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
      .addFields([
        {
          name: member.guild.language.get("MODERATOR"),
          value: moderator.toString(),
        },
        {
          name: member.guild.language.get("REASON"),
          value: reason,
        },
      ])
      .setFooter({ text: `${member.id} | ${moderator.id}` });
    if (roles.length)
      embed.addFields({
        name: member.guild.language.get("ROLES"),
        value: roles.map((role) => role.toString()).join(" - "),
      });
    return await member.guild
      .modLog(embed, ModLogTypes.ROLE_PERSIST)
      .catch(() => {});
  }
}
