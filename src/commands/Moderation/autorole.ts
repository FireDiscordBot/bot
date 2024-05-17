import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { Role } from "discord.js";

export default class Autorole extends Command {
  constructor() {
    super("autorole", {
      description: (language: Language) =>
        language.get("AUTOROLE_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageRoles,
      ],
      userPermissions: [PermissionFlagsBits.ManageGuild],
      restrictTo: "guild",
      args: [
        {
          id: "role",
          type: "roleSilent",
          readableType: "role",
          required: false,
          default: null,
        },
        {
          id: "delay",
          flag: "--delay",
          match: "flag",
          required: false,
        },
        {
          id: "bot",
          flag: "--bot",
          match: "flag",
          default: null,
          required: false,
        },
      ],
      enableSlashCommand: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { role: Role; delay?: boolean; bot?: boolean }
  ) {
    let { role, delay, bot } = args;

    if (!role) {
      message.guild.settings.delete(bot ? "mod.autobotrole" : "mod.autorole");
      !bot && message.guild.settings.delete("mod.autorole.waitformsg");
      return await message.success(
        bot ? "AUTOROLE_DISABLED_BOT" : "AUTOROLE_DISABLED"
      );
    }

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
    if (bot && delay) return await message.error("AUTOROLE_INVALID_FLAGS");

    delay
      ? message.guild.settings.set<boolean>("mod.autorole.waitformsg", true)
      : message.guild.settings.delete("mod.autorole.waitformsg");
    message.guild.settings.set<string>(
      bot ? "mod.autobotrole" : "mod.autorole",
      role.id
    );

    await message.success(bot ? "AUTOROLE_ENABLED_BOT" : "AUTOROLE_ENABLED", {
      role: role.toString(),
      delay: !!delay
        ? message.language.get("AUTOROLE_ENABLED_FIRST_MESSAGE")
        : message.language.get("AUTOROLE_ENABLED_JOIN"),
    });
  }
}
