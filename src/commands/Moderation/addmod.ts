import { MessageEmbed, Permissions, Snowflake, Role } from "discord.js";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class AddModerator extends Command {
  constructor() {
    super("addmod", {
      description: (language: Language) =>
        language.get("ADDMOD_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
        Permissions.FLAGS.ADD_REACTIONS,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      args: [
        {
          id: "modToAdd",
          type: "member|role",
          readableType: "mention",
          match: "rest",
          default: null,
          required: false,
        },
      ],
      enableSlashCommand: true,
      // Providing no argument will list mods so might as well just have the one command
      aliases: ["addmoderator", "listmods", "listmoderators"],
      typing: true,
    });
  }

  async exec(message: FireMessage, args: { modToAdd: FireMember | Role }) {
    const modToAdd = args.modToAdd;
    if (
      ["listmods", "listmoderators"].includes(message.util.parsed.alias) ||
      !modToAdd
    )
      return await this.getModeratorEmbed(message);
    let current = message.guild.settings.get<string[]>("utils.moderators", []);
    if (!current.includes(modToAdd.id)) current.push(modToAdd.id);
    else current = current.filter((id) => id != modToAdd.id);
    if (current.length)
      message.guild.settings.set<string[]>("utils.moderators", current);
    else message.guild.settings.delete("utils.moderators");
    return await this.getModeratorEmbed(message);
  }

  async getModeratorEmbed(message: FireMessage) {
    const moderators = message.guild.settings.get<Snowflake[]>(
      "utils.moderators",
      []
    );
    if (!moderators.length) return await message.error("NO_MODERATORS_SET");
    const roles = moderators.filter((id) => message.guild.roles.cache.has(id));
    const members = await message.guild.members.fetch({
      user: moderators.filter((id) => !roles.includes(id)),
    });
    const mentions = {
      roles: roles.map((rid) => `<@&${rid}>`),
      members: members.map((member: FireMember) => member.toMention()),
    };
    const invalid = [
      ...moderators.filter(
        (id) => !roles.includes(id) && !members.find((m) => m.id == id)
      ),
    ];
    let filteredModerators = moderators.filter((id) => !invalid.includes(id));
    if (moderators != filteredModerators)
      message.guild.settings.set<string[]>(
        "utils.moderators",
        filteredModerators
      );
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .addField(
        message.language.get("MODERATORS_ROLES"),
        mentions.roles.join("\n") || message.language.get("NO_MODERATOR_ROLES")
      )
      .addField(
        message.language.get("MODERATORS_MEMBERS"),
        mentions.members.join("\n") ||
          message.language.get("NO_MODERATOR_MEMBERS")
      );
    if (invalid.length)
      embed.addField(
        message.language.get("MODERATORS_REMOVE_INVALID"),
        message.language.get("MODERATORS_REMOVED", {
          invalid: invalid.join(", "),
        })
      );
    return await message.channel.send({ embeds: [embed] });
  }
}
