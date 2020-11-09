import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { FireUser } from "../../../lib/extensions/user";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Util } from "discord.js";
import { MessageEmbed } from "discord.js";

export default class Specs extends Command {
  constructor() {
    super("specs", {
      description: (language: Language) =>
        language.get("SPECS_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES"],
      restrictTo: "guild",
      args: [
        {
          id: "user",
          type: "userSilent",
          default: null,
          required: false,
        },
      ],
      aliases: ["delspecs"],
      hidden: true,
    });
  }

  condition(message: FireMessage) {
    return (
      message.util?.parsed?.command?.id == "specs" && // akairo moment
      message.guild.id == "411619823445999637"
    );
  }

  async exec(message: FireMessage, args: { user?: FireUser }) {
    const user = args.user || message.author;
    const specs = await this.client.db
      .query("SELECT * FROM specs WHERE uid=$1", [user.id])
      .first();
    const member = (await message.guild.members.fetch(user)) as FireMember;
    if (!specs || !specs.data) return await message.error("SPECS_NOT_FOUND");
    if (
      message.util.parsed.alias == "delspecs" &&
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

    const escape = (text: string) => {
      text = Util.escapeMarkdown(text).replace(
        /<a?:[a-zA-Z0-9\_]+:([0-9]+)>/im,
        ""
      );
      return text.slice(0, 1024);
    };

    const embed = new MessageEmbed()
      .setColor(member ? member.displayColor : "#ffffff")
      .setTimestamp(new Date())
      .setAuthor(
        user.toString(),
        user.displayAvatarURL({ size: 2048, dynamic: true }),
        "https://inv.wtf/sk1spec"
      )
      .addField("» CPU", escape(specs.get("cpu") as string))
      .addField("» GPU", escape(specs.get("gpu") as string))
      .addField("» RAM", escape(specs.get("ram") as string))
      .addField("» OS", escape(specs.get("os") as string));
    return await message.channel.send(embed);
  }
}
