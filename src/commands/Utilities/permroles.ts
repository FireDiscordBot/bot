import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "@fire/lib/util/paginators";
import { MessageEmbed, TextChannel, Permissions, Role } from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class PermRoles extends Command {
  constructor() {
    super("permroles", {
      description: (language: Language) =>
        language.get("PERMROLES_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.MANAGE_ROLES],
      userPermissions: [Permissions.FLAGS.MANAGE_ROLES],
      args: [
        {
          id: "role",
          type: "role",
          required: false,
          default: null,
        },
      ],
      aliases: ["permrole", "permissionroles", "permissionrole"],
      enableSlashCommand: true,
      restrictTo: "guild",
      cooldown: 300000,
      lock: "guild",
    });
  }

  async exec(message: FireMessage, args: { role?: Role }) {
    if (!args.role) {
      if (!message.guild.permRoles.size)
        return await message.error("PERMROLES_NONE_FOUND");
      const paginator = new WrappedPaginator("", "", 800);
      for (const [id, perms] of message.guild.permRoles) {
        const role = message.guild.roles.cache.get(id);
        if (!role) continue;
        const allow = new Permissions(perms.allow);
        const deny = new Permissions(perms.deny);
        const friendlyAllowed = allow
          .toArray()
          .map((permission) =>
            this.client.util.cleanPermissionName(permission, message.language)
          )
          .filter((permission) => !!permission);
        const friendlyDenied = deny
          .toArray()
          .map((permission) =>
            this.client.util.cleanPermissionName(permission, message.language)
          )
          .filter((permission) => !!permission);
        paginator.addLine(
          message.language.get(
            "PERMROLES_CURRENT_ITEM",
            role.toString(),
            friendlyAllowed,
            friendlyDenied
          ) as string
        );
      }
      // color was chosen by me spamming space on coolors.co (https://coolors.co/0f5257-0b3142-9c92a3-c6b9cd-d6d3f0)
      const embed = new MessageEmbed().setColor("#0F5257").setTimestamp();
      const paginatorInterface = new PaginatorEmbedInterface(
        this.client,
        paginator,
        { owner: message.member, embed }
      );
      return await paginatorInterface.send(message.channel);
    }

    if (!message.guild.premium && message.guild.permRoles.size >= 1)
      return await message.error("PERMROLES_LIMIT_PREMIUM");

    if (
      args.role &&
      (args.role.managed ||
        args.role.rawPosition >= message.guild.me.roles.highest.rawPosition ||
        args.role.id == message.guild.roles.everyone.id ||
        (args.role.rawPosition >= message.member.roles.highest.rawPosition &&
          message.guild.ownerID != message.author.id))
    )
      return await message.error("ERROR_ROLE_UNUSABLE");

    const channelPerms = (message.channel as TextChannel).permissionOverwrites.get(
      args.role.id
    );
    if (!channelPerms) return await message.error("PERMROLES_NOTHING_TO_COPY");

    if (
      channelPerms.allow.has(Permissions.FLAGS.MANAGE_ROLES) ||
      channelPerms.deny.has(Permissions.FLAGS.MANAGE_ROLES)
    )
      return await message.error("PERMROLES_MANAGE_ROLES");

    if (
      channelPerms.allow
        .toArray()
        .some((permission) => !message.guild.me.permissions.has(permission)) ||
      channelPerms.deny
        .toArray()
        .some((permission) => !message.guild.me.permissions.has(permission))
    )
      return await message.error("PERMROLES_MISSING_PERMISSIONS");

    const exists = message.guild.permRoles.has(args.role.id);
    const inserted = await this.client.db
      .query(
        exists
          ? "UPDATE permroles SET (allow, deny) = ($1, $2) WHERE gid=$3 AND rid=$4;"
          : "INSERT INTO permroles (allow, deny, gid, rid) VALUES ($1, $2, $3, $4);",
        [
          channelPerms.allow.bitfield.toString(),
          channelPerms.deny.bitfield.toString(),
          message.guild.id,
          args.role.id,
        ]
      )
      .catch(() => {});
    if (!inserted) return await message.error("PERMROLES_DB_ERROR");

    message.guild.permRoles.set(args.role.id, {
      allow: channelPerms.allow.bitfield,
      deny: channelPerms.deny.bitfield,
    });

    const updating = await message.send("PERMROLES_UPDATING_CHANNELS");
    let failed = 0;
    for (const [, channel] of message.guild.channels.cache.filter(
      (channel) =>
        channel
          .permissionsFor(message.guild.me)
          .has(Permissions.FLAGS.MANAGE_ROLES) &&
        (channel.permissionOverwrites.get(args.role.id)?.allow.bitfield !=
          channelPerms.allow.bitfield ||
          channel.permissionOverwrites.get(args.role.id)?.deny.bitfield !=
            channelPerms.deny.bitfield)
    ))
      await channel
        .overwritePermissions(
          [
            ...channel.permissionOverwrites.array().filter(
              // ensure the overwrites below are used instead
              (overwrite) => overwrite.id != args.role.id
            ),
            {
              allow: channelPerms.allow,
              deny: channelPerms.deny,
              id: args.role.id,
              type: "role",
            },
          ],
          message.guild.language.get("PERMROLES_REASON")
        )
        .catch(() => failed++);
    return await updating.edit(
      message.language.get(
        failed ? "PERMROLES_FINISHED_FAIL_SOME" : "PERMROLES_FINISHED",
        failed
      )
    );
  }
}
