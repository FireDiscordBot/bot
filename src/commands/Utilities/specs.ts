import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { FireUser } from "../../../lib/extensions/user";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Util, MessageEmbed } from "discord.js";
import { Argument } from "discord-akairo";

const emojiRegex = /<a?:[a-zA-Z0-9\_]+:([0-9]+)>/gim;
const escape = (text: string) => {
  text = Util.escapeMarkdown(text).replace(emojiRegex, "");
  return text.slice(0, 1024);
};

export default class Specs extends Command {
  constructor() {
    super("specs", {
      description: (language: Language) =>
        language.get("SPECS_COMMAND_DESCRIPTION"),
      restrictTo: "guild",
      args: [
        {
          id: "user",
          type: Argument.union("memberSilent", "user"),
          readableType: "user",
          default: undefined,
          required: false,
        },
      ],
      guilds: ["411619823445999637", "755794954743185438"],
      enableSlashCommand: true,
      aliases: ["delspecs"],
      hidden: true,
    });
  }

  async exec(message: FireMessage, args: { user?: FireMember | FireUser }) {
    let user = args.user;
    let member: FireMember;
    if (!user) user = message.member;
    const specs = await this.client.db
      .query("SELECT * FROM specs WHERE uid=$1", [user.id])
      .first();
    if (!specs || !specs.data) return await message.error("SPECS_NOT_FOUND");
    member =
      user instanceof FireMember
        ? user
        : ((await message.guild.members.fetch(user)) as FireMember);
    if (
      message.util.parsed.alias == "delspecs" &&
      message.guild.id == "411619823445999637" &&
      message.member.isModerator()
    ) {
      try {
        await this.client.db.query("DELETE FROM specs WHERE uid=$1;", [
          user.id,
        ]);
        if (member) await member.roles.remove("595626786549792793");
        return await message.success();
      } catch {
        return await message.error();
      }
    }

    const embed = new MessageEmbed()
      .setColor(member ? member.displayHexColor : "#ffffff")
      .setTimestamp()
      .setAuthor(
        user.toString(),
        member.user.displayAvatarURL({ size: 2048, dynamic: true }),
        "https://inv.wtf/sk1spec"
      )
      .addField("» CPU", escape(specs.get("cpu") as string))
      .addField("» GPU", escape(specs.get("gpu") as string))
      .addField("» RAM", escape(specs.get("ram") as string))
      .addField("» OS", escape(specs.get("os") as string));
    return await message.channel.send(embed);
  }
}
