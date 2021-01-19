import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Role } from "discord.js";

export default class Autorole extends Command {
  constructor() {
    super("autorole", {
      description: (language: Language) =>
        language.get("AUTOROLE_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS", "MANAGE_ROLES"],
      userPermissions: ["MANAGE_GUILD"],
      restrictTo: "guild",
      args: [
        {
          id: "role",
          type: "roleSilent",
          readableType: "role",
          default: null,
          required: true,
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
      message.guild.settings.delete("mod.autorole.waitformsg");
      return await message.success(
        bot ? "AUTOROLE_DISABLED_BOT" : "AUTOROLE_DISABLED"
      );
    }

    if (
      role.position > (message.guild.me?.roles.highest.position || 0) ||
      role.managed
    )
      return await message.error("ERROR_ROLE_UNUSABLE");
    if (bot && delay) return await message.error("AUTOROLE_INVALID_FLAGS");

    delay
      ? message.guild.settings.set("mod.autorole.waitformsg", true)
      : message.guild.settings.delete("mod.autorole.waitformsg");
    message.guild.settings.set(
      bot ? "mod.autobotrole" : "mod.autorole",
      role.id
    );

    await message.success(
      bot ? "AUTOROLE_ENABLED_BOT" : "AUTOROLE_ENABLED",
      role.toString(),
      !!delay
    );
  }
}
