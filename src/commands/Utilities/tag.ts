import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { MessageEmbed } from "discord.js";
import * as fuzz from "fuzzball";

export default class Tag extends Command {
  constructor() {
    super("tag", {
      description: (language: Language) =>
        language.get("TAG_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      args: [
        {
          id: "tag",
          type: "string",
          default: null,
          required: false,
        },
      ],
      restrictTo: "guild",
      aliases: ["tags", "dtag", "dtags"],
    });
  }

  async exec(message: FireMessage, args: { tag?: string }) {
    let tags: { [key: string]: string } = {};
    const tagsResult = await this.client.db.query(
      args.tag
        ? "SELECT * FROM tags WHERE gid=$1 AND name=$2;"
        : "SELECT * FROM tags WHERE gid=$1;",
      [message.guild.id, args.tag]
    );
    if (tagsResult.status == "SELECT 0")
      return await message.error("TAG_NONE_FOUND");
    for await (const tag of tagsResult) {
      tags[(tag.get("name") as string).toLowerCase()] = tag.get(
        "content"
      ) as string;
    }
    const names = Object.keys(tags);
    if (!names.length) return await message.error("TAG_NONE_FOUND");
    if (args.tag && !names.includes(args.tag))
      args.tag = this.getFuzzyTag(names, args.tag);
    if (args.tag && names.includes(args.tag.toLowerCase())) {
      if (["dtag", "dtags"].includes(message.util?.parsed?.alias))
        message.delete();
      return await message.channel.send(
        tags[args.tag.toLowerCase()] || "uh oh something went wrong"
      );
    } else if (args.tag)
      return await message.error("TAG_INVALID_TAG", args.tag);
    else if (!args.tag) {
      const embed = new MessageEmbed()
        .setAuthor(
          message.language.get("TAG_LIST", message.guild.name),
          message.guild.iconURL({ size: 2048, format: "png", dynamic: true })
        )
        .setColor(message?.member.displayColor || "#ffffff")
        .setDescription(names.join(", "));
      return await message.channel.send(embed);
    }
  }

  getFuzzyTag(names: string[], arg: string) {
    for (const name of names) {
      const asciiName = name
        .split("")
        .map((char) => {
          if (char.charCodeAt(0) < 127 && char.charCodeAt(0) > 0) return char;
          else return "";
        })
        .join("");
      if (
        fuzz.ratio(arg.trim().toLowerCase(), asciiName.trim().toLowerCase()) >=
        60
      )
        return asciiName;
    }
    return null;
  }
}
