import { categoryChannelConverter } from "../../../lib/util/converters";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { MessageEmbed } from "discord.js";
import { v4 as uuidv4 } from "uuid";
import { readFileSync } from "fs";

export default class Tickets extends Command {
  words: string[];

  constructor() {
    super("ticket", {
      description: (language: Language) =>
        language.get("TICKET_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS", "MANAGE_CHANNELS"],
      userPermissions: ["MANAGE_GUILD"],
      restrictTo: "guild",
      args: [
        {
          id: "action",
          type: ["category", "limit", "name"],
          readableType: "category|limit|name",
          default: null,
          required: false,
        },
        {
          id: "value",
          type: "string",
          readableType: "category|number|string",
          default: null,
          required: false,
        },
      ],
      aliases: ["tickets"],
    });
    this.words = readFileSync("words.txt").toString().split(" ");
  }

  async exec(
    message: FireMessage,
    args: { action?: "category" | "limit" | "name"; value?: string }
  ) {
    if (!args.action) return await this.sendDefaultMessage(message);
    switch (args.action) {
      case "category": {
        if (!args.value) {
          message.guild.settings.delete("tickets.parent");
          return await message.success("TICKETS_DISABLED");
        } else {
          const category = await categoryChannelConverter(message, args.value);
          if (!category) return;
          message.guild.settings.set("tickets.parent", category.id);
          return await message.success("TICKETS_ENABLED", category.name);
        }
      }
      case "limit": {
        const limit = parseInt(args.value || "0");
        if (!limit || limit > 5 || limit < 0)
          return await message.error("TICKETS_INVALID_LIMIT");
        message.guild.settings.set("tickets.limit", limit);
        return await message.success();
      }
      case "name": {
        const variables = {
          "{increment}": message.guild.settings
            .get("tickets.increment", 0)
            .toString() as string,
          "{name}": message.author.username,
          "{id}": message.author.id,
          "{word}": this.client.util.randomItem(this.words) as string,
          "{uuid}": uuidv4().slice(0, 4),
        };
        if (!args.value) {
          const variableString = Object.entries(variables)
            .map((key) => `${key[0]}: ${key[1]}`)
            .join("\n");
          const embed = new MessageEmbed()
            .setColor(message.member?.displayColor || "#ffffff")
            .setTimestamp(new Date())
            .addField(message.language.get("VARIABLES"), variableString);
          return await message.channel.send(embed);
        } else {
          if (args.value.length > 50)
            return await message.error("TICKET_NAME_LENGTH");
          message.guild.settings.set("tickets.name", args.value);
          let name = args.value;
          for (const [key, value] of Object.entries(variables))
            name = name.replace(key, value);
          return await message.success("TICKET_NAME_SET", args.value, name);
        }
      }
    }
  }

  async sendDefaultMessage(message: FireMessage) {
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor || "#ffffff")
      .setTimestamp(new Date())
      .setDescription(message.language.get("TICKET_MAIN_DESCRIPTION"))
      .setAuthor(
        message.author.toString(),
        message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .addField(
        `${message.util.parsed?.prefix}ticket category [<category>]`,
        message.language.get("TICKET_CATEGORY_DESCRIPTION")
      )
      .addField(
        `${message.util.parsed?.prefix}ticket limit <number>`,
        message.language.get("TICKET_LIMIT_DESCRIPTION")
      )
      .addField(
        `${message.util.parsed?.prefix}ticket name [<name>]`,
        message.language.get("TICKET_NAME_DESCRIPTION")
      );
    return await message.channel.send(embed);
  }
}
