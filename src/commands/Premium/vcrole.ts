import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { VoiceChannel, Role } from "discord.js";

export default class VCRole extends Command {
  constructor() {
    super("vcrole", {
      description: (language: Language) =>
        language.get("VCROLE_COMMAND_DESCRIPTION"),
      userPermissions: ["MANAGE_CHANNELS", "MANAGE_ROLES"],
      clientPermissions: ["MANAGE_ROLES"],
      args: [
        {
          id: "channel",
          type: "voiceChannel",
          required: true,
          default: null,
        },
        {
          id: "role",
          type: "role",
          match: "rest",
          required: false,
          default: null,
        },
      ],
      aliases: ["vcroles", "voicerole", "voiceroles"],
      enableSlashCommand: true,
      restrictTo: "guild",
      premium: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { channel?: VoiceChannel; role?: Role }
  ) {
    if (!args.channel) return await message.error("VCROLE_CHANNEL_REQUIRED");
    if (args.channel && !args.role) {
      const existing = message.guild.vcRoles.get(args.channel.id);
      if (!existing) return await message.error("VCROLE_ROLE_REQUIRED");
      const removed = await this.client.db
        .query("DELETE FROM vcroles WHERE gid=$1 AND cid=$2", [
          message.guild.id,
          args.channel.id,
        ])
        .catch(() => {});
      if (removed) {
        message.guild.vcRoles.delete(args.channel.id);
        const states = message.guild.voiceStates.cache.filter(
          (state) => state.channelID == args.channel.id
        );
        const members = await message.guild.members
          .fetch({
            user: states.map((state) => state.id),
          })
          .catch(() => {});
        if (members) {
          for (const [, member] of members)
            await member.roles.remove(existing).catch(() => {});
        }
        return await message.success("VCROLE_RESET");
      } else return await message.error("VCROLE_RESET_FAILED");
    }

    const already = message.guild.vcRoles.has(args.channel.id);

    const inserted = await this.client.db
      .query(
        already
          ? "UPDATE vcroles SET rid=$1 WHERE gid=$2 AND cid=$3;"
          : "INSERT INTO vcroles (rid, gid, cid) VALUES ($1, $2, $3);",
        [args.role.id, message.guild.id, args.channel.id]
      )
      .catch(() => {});
    if (inserted) {
      message.guild.vcRoles.set(args.channel.id, args.role.id);
      const states = message.guild.voiceStates.cache.filter(
        (state) => state.channelID == args.channel.id
      );
      const members = await message.guild.members
        .fetch({
          user: states.map((state) => state.id),
        })
        .catch(() => {});
      if (members) {
        for (const [, member] of members)
          await member.roles.add(args.role).catch(() => {});
      }
      return await message.success(
        "VCROLE_SET",
        args.channel.name,
        args.role.toString()
      );
    } else return await message.error("VCROLE_SET_FAILED");
  }
}
