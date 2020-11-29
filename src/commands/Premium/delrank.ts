import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Role } from "discord.js";

export default class DelRank extends Command {
  constructor() {
    super("delrank", {
      description: (language: Language) =>
        language.get("DELRANK_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS", "MANAGE_ROLES"],
      userPermissions: ["MANAGE_ROLES"],
      restrictTo: "guild",
      args: [
        {
          id: "role",
          type: "role",
          default: null,
          required: true,
        },
      ],
      aliases: ["delselfrole", "deljoinrole", "deljoinablerole", "delselfrank"],
      premium: true,
    });
  }

  async exec(message: FireMessage, args: { role?: Role }) {
    if (!args.role) return;
    if (
      args.role.position > (message.guild.me?.roles.highest.position || 0) ||
      args.role.managed
    )
      return await message.error("ERROR_ROLE_UNUSABLE");

    let current = message.guild.settings.get("utils.ranks", []) as string[];
    if (!current.includes(args.role.id))
      return await message.error("RANKS_INVALID_ROLE_DEL");
    else {
      current = current.filter((id) => id != args.role?.id);
      message.guild.settings.set("utils.ranks", current);
      return await message.success();
    }
  }
}
