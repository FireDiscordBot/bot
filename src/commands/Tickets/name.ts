import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Permissions } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { v4 as uuidv4 } from "uuid";
import { readFileSync } from "fs";

export default class TicketName extends Command {
  words: string[];

  constructor() {
    super("ticket-name", {
      description: (language: Language) =>
        language.get("TICKET_NAME_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.MANAGE_CHANNELS,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      restrictTo: "guild",
      args: [
        {
          id: "name",
          type: "string",
          required: false,
          default: null,
        },
      ],
      aliases: ["tickets-name"],
      parent: "ticket",
    });
    this.words = readFileSync("words.txt").toString().split("\n");
  }

  async exec(message: FireMessage, args: { name?: string }) {
    const variables = {
      "{increment}": message.guild.settings
        .get("tickets.increment", 0)
        .toString() as string,
      "{name}": message.author.username,
      "{id}": message.author.id,
      "{word}": this.client.util.randomItem(this.words) as string,
      "{uuid}": uuidv4().slice(0, 4),
    };
    if (!args.name) {
      const variableString = Object.entries(variables)
        .map((key) => `${key[0]}: ${key[1]}`)
        .join("\n");
      const embed = new MessageEmbed()
        .setColor(message.member?.displayColor || "#FFFFFF")
        .setTimestamp()
        .addField(message.language.get("VARIABLES"), variableString);
      return await message.channel.send({ embeds: [embed] });
    } else {
      if (args.name.length > 50)
        return await message.error("TICKET_NAME_LENGTH");
      message.guild.settings.set<string>(
        "tickets.name",
        args.name.replace(/\s/gim, "-")
      );
      let name = args.name;
      for (const [key, value] of Object.entries(variables))
        name = name.replace(key, value);
      return await message.success("TICKET_NAME_SET", {
        name: args.name,
        example: name,
      });
    }
  }
}
