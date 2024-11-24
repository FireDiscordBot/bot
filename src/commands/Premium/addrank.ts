import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { Role } from "discord.js";

export default class AddRank extends Command {
  constructor() {
    super("addrank", {
      description: (language: Language) =>
        language.get("ADDRANK_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.EmbedLinks,
      ],
      userPermissions: [PermissionFlagsBits.ManageRoles],
      restrictTo: "guild",
      args: [
        {
          id: "role",
          type: "role",
          default: null,
          required: true,
        },
      ],
      aliases: ["addselfrole", "addjoinrole", "addjoinablerole", "addselfrank"],
      enableSlashCommand: true,
      premium: true,
    });
  }

  async exec(message: FireMessage, args: { role?: Role }) {
    if (!args.role) return;
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

    let current = message.guild.settings.get<string[]>("utils.ranks", []);
    if (current.includes(args.role.id))
      return await message.error("RANKS_ALREADY_ADDED");
    else if (current.length >= 25 && !message.hasExperiment(547090817, 1))
      return await message.error("RANKS_LIMIT");
    else {
      current.push(args.role.id);
      message.guild.settings.set<string[]>(
        "utils.ranks",
        current,
        message.author
      );
      return await message.success("ADDRANK_SUCCESS", {
        role: args.role.toString(),
      });
    }
  }
}
