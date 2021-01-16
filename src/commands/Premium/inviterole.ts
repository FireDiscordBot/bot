import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Invite, Role } from "discord.js";

export default class InviteRole extends Command {
  constructor() {
    super("inviterole", {
      description: (language: Language) =>
        language.get("INVITEROLE_COMMAND_DESCRIPTION"),
      userPermissions: ["MANAGE_GUILD"],
      args: [
        {
          id: "invite",
          type: "invite",
          required: true,
          default: null,
        },
        {
          id: "role",
          type: "roleSilent",
          match: "rest",
          required: false,
          default: null,
        },
      ],
      aliases: ["invrole", "invroles", "inviteroles"],
      enableSlashCommand: true,
      restrictTo: "guild",
      premium: true,
    });
  }

  async exec(message: FireMessage, args: { invite: Invite; role: Role }) {
    if (args.invite?.guild?.id != message.guild.id)
      return await message.error("INVITEROLE_GUILD_INVITE_REQUIRED");
    if (
      args.role &&
      (args.role.managed ||
        args.role.rawPosition > message.guild.me.roles.highest.rawPosition ||
        args.role.id == message.guild.roles.everyone.id ||
        args.role.rawPosition > message.member.roles.highest.rawPosition)
    )
      return await message.error("INVITEROLE_ROLE_INVALID");
    const invite = args.invite.code;
    if (message.guild.inviteRoles.has(invite) && !args.role) {
      const role = message.guild.roles.cache.get(
        message.guild.inviteRoles.get(invite)
      );
      message.guild.inviteRoles.delete(invite);
      const deleted = await this.client.db
        .query("DELETE FROM invrole WHERE inv=$1;", [invite])
        .catch(() => {});
      return deleted && deleted.status.startsWith("DELETE")
        ? await message.success(
            "INVITEROLE_DELETE_SUCCESS",
            invite,
            role?.toString()
          )
        : await message.error(
            "INVITEROLE_DELETE_FAILED",
            invite,
            role?.toString()
          );
    } else if (!args.role)
      return await message.error("INVITEROLE_ROLE_REQUIRED");

    const role = args.role;
    const exists = message.guild.inviteRoles.has(invite);
    const added = await this.client.db
      .query(
        exists
          ? "UPDATE invrole SET rid=$3 WHERE gid=$1 AND inv=$2;"
          : "INSERT INTO invrole (gid, inv, rid) VALUES ($1, $2, $3);",
        [message.guild.id, invite, role.id]
      )
      .catch(() => {});
    if (added) message.guild.inviteRoles.set(invite, role.id);
    return added &&
      (added.status.startsWith("INSERT") || added.status.startsWith("UPDATE"))
      ? await message.success(
          "INVITEROLE_CREATE_SUCCESS",
          invite,
          role?.toString(),
          !exists
        )
      : await message.error(
          "INVITEROLE_CREATE_FAILED",
          invite,
          role?.toString()
        );
  }
}
