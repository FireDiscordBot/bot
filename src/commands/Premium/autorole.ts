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
      premium: true,
      args: [
        {
          id: "role",
          type: "role",
          default: null,
          required: true,
        },
        {
          id: "delay",
          flag: "--delay",
          default: null,
          required: false,
        },
        {
          id: "bot",
          flag: "--bot",
          default: null,
          required: false,
        },
      ],
    });
  }

  async exec(
    message: FireMessage,
    args: { role: Role; delay?: string; bot?: string }
  ) {
    let { role, delay, bot } = args;
    if (
      role.position > (message.guild.me?.roles.highest.position || 0) ||
      role.managed
    )
      return await message.error("ERROR_ROLE_UNUSABLE");
    if (delay == "--bot") {
      // Discord Akairo's flags suck
      delay = undefined;
      bot = "--bot";
    } else if (bot == "--delay") {
      bot = undefined;
      delay = "--delay";
    }

    if (!role) {
      message.guild.settings.delete(bot ? "mod.autobotrole" : "mod.autorole");
      message.guild.settings.delete("mod.autorole.waitformsg");
      return await message.success(
        bot ? "AUTOROLE_DISABLED_BOT" : "AUTOROLE_DISABLED"
      );
    }

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
      role.toString()
    );
  }
}
