import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Role, MessageEmbed } from "discord.js";

export default class AddModerator extends Command {
  constructor() {
    super("addmod", {
      description: (language: Language) =>
        language.get("ADDMOD_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS", "ADD_REACTIONS"],
      userPermissions: ["MANAGE_GUILD"],
      args: [
        {
          id: "modToAdd",
          type: "member|role",
          match: "rest",
          default: null,
          required: false,
        },
      ],
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
    let current = message.guild.settings.get(
      "utils.moderators",
      []
    ) as string[];
    if (!current.includes(modToAdd.id)) current.push(modToAdd.id);
    else current = current.filter((id) => id != modToAdd.id);
    message.guild.settings.set("utils.moderators", current);
    await message.success();
    return await this.getModeratorEmbed(message);
  }

  async getModeratorEmbed(message: FireMessage) {
    const moderators = message.guild.settings.get(
      "utils.moderators",
      []
    ) as string[];
    if (!moderators.length) return await message.error("NO_MODERATORS_SET");
    const roles = moderators.filter((id) => message.guild.roles.cache.has(id));
    const members = (
      await message.guild.members.fetch({
        user: moderators.filter((id) => !roles.includes(id)),
      })
    ).array();
    let mentions = { roles: [], members: [] };
    roles.forEach((rid) => mentions.roles.push(`<@&${rid}>`));
    members.forEach((member: FireMember) =>
      mentions.members.push(member.toMention())
    );
    const invalid = [
      ...moderators.filter((id) => !JSON.stringify(mentions).includes(id)),
    ];
    let filteredModerators = moderators.filter((id) => !invalid.includes(id));
    if (moderators != filteredModerators)
      message.guild.settings.set("utils.moderators", filteredModerators);
    const embed = new MessageEmbed()
      .setColor(message.member?.displayHexColor || "#ffffff")
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
        message.language.get("MODERATORS_REMOVED", invalid)
      );
    return await message.channel.send(embed);
  }
}
