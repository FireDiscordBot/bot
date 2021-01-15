import { SlashCommandMessage } from "../../../lib/extensions/slashCommandMessage";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { TextChannel } from "discord.js";
import * as centra from "centra";

export default class Discover extends Command {
  constructor() {
    super("suggest", {
      description: (language: Language) =>
        language.get("SUGGEST_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      ephemeral: true,
      args: [
        {
          id: "suggestion",
          type: "string",
          default: null,
          required: true,
        },
      ],
    });
  }

  async exec(message: FireMessage, args: { suggestion: string }) {
    if (
      !args.suggestion ||
      !process.env.TRELLO_KEY ||
      !process.env.TRELLO_TOKEN
    )
      return await message.error();
    const channel =
      message instanceof SlashCommandMessage
        ? message.realChannel
        : message.channel;
    let card = await centra("https://api.trello.com/1/cards", "POST")
      .query("key", process.env.TRELLO_KEY)
      .query("token", process.env.TRELLO_TOKEN)
      .query("name", args.suggestion)
      .query(
        "desc",
        `Suggested by ${message.author.username} (${
          message.author.id
        }) in channel ${(channel as TextChannel).name} (${
          channel.id
        }) in guild ${message.guild.name} (${
          message.guild.id
        }) at ${new Date().toLocaleString()}`
      )
      .query("idList", "5dec080808a88d85c24a3681")
      .send();
    if (card.statusCode == 200) {
      card = await card.json();
      return await message.success("SUGGESTION_SUCCESS", card);
    } else return await message.error();
  }
}
