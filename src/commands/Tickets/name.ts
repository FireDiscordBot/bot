import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { MessageEmbed } from "discord.js";
import { readFileSync } from "fs";
import { v4 as uuidv4 } from "uuid";

export default class TicketName extends Command {
  words: string[];

  constructor() {
    super("ticket-name", {
      description: (language: Language) =>
        language.get("TICKET_NAME_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      userPermissions: [PermissionFlagsBits.ManageGuild],
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
    const parents = message.guild.settings.get<string[]>("tickets.parent", []);
    if (
      message.guild.hasExperiment(1651882237, 1) &&
      message.guild.channels.cache.get(parents[0])?.type != "GUILD_CATEGORY"
    )
      return await message.error("TICKET_NAME_UNAVAILABLE_F0R_THREADS");

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
