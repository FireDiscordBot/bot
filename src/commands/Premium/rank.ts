import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { MessageEmbed, Role } from "discord.js";

export default class Rank extends Command {
  constructor() {
    super("rank", {
      description: (language: Language) =>
        language.get("RANK_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS", "MANAGE_ROLES"],
      restrictTo: "guild",
      args: [
        {
          id: "role",
          type: "roleSilent",
          default: null,
          required: false,
        },
      ],
      aliases: [
        "ranks",
        "joinroles",
        "joinableroles",
        "selfroles",
        "selfranks",
      ],
      premium: true,
    });
  }

  async exec(message: FireMessage, args: { role?: Role }) {
    let roles: string[] | Role[] = (message.guild.settings.get(
      "utils.ranks",
      []
    ) as string[]).filter((id) => message.guild.roles.cache.has(id));
    if (message.guild.settings.get("utils.ranks", []) != roles)
      message.guild.settings.set("utils.ranks", roles);
    if (!roles.length) return await message.error("RANKS_NONE_FOUND");
    roles = roles.map((id) => message.guild.roles.cache.get(id) as Role);

    if (!args.role) {
      const isCached =
        message.guild.members.cache.size / message.guild.memberCount;
      let roleInfo: string[] = [];
      roles.forEach((role: Role) =>
        roleInfo.push(
          isCached > 0.98
            ? (message.language.get("RANKS_INFO", role) as string)
            : `> ${role}`
        )
      );
      const embed = new MessageEmbed()
        .setColor(message.member?.displayColor || "#ffffff")
        .setTimestamp(new Date())
        .setDescription(roleInfo.join("\n"))
        .setAuthor(
          message.language.get("RANKS_AUTHOR", message.guild),
          message.guild.icon
            ? (message.guild.iconURL({
                size: 2048,
                format: "png",
                dynamic: true,
              }) as string)
            : undefined
        );
      return await message.channel.send(embed);
    }

    if (roles.includes(args.role)) {
      if (args.role.id == "595626786549792793") {
        const specs = await this.client.db.query(
          "SELECT * FROM specs WHERE uid=$1;",
          [message.member.id]
        );
        if (!specs.rows?.length)
          return await message.send(
            "RANKS_SK1ER_NO_SPECS",
            message.member.toMention()
          );
      }
      message.member?.roles?.cache?.has(args.role.id)
        ? await message.member?.roles
            ?.remove(
              args.role,
              message.guild.language.get("RANKS_LEAVE_REASON") as string
            )
            .catch(() => {})
            .then(() => message.success("RANKS_LEFT_RANK", args.role.name))
        : await message.member?.roles
            ?.add(
              args.role,
              message.guild.language.get("RANKS_JOIN_REASON") as string
            )
            .catch(() => {})
            .then(() => message.success("RANKS_JOIN_RANK", args.role.name));
    } else return await message.error("RANKS_INVALID_ROLE");
  }
}
