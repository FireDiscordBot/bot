import { FireMessage } from "../../lib/extensions/message";
import { Language } from "../../lib/util/language";
import { Command } from "../../lib/util/command";

export default class extends Command {
  constructor() {
    super("vote", {
      description: (language: Language) =>
        language.get("VOTE_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES"],
      aliases: ["dbl", "top.gg", "dboats", "discord.boats"],
    });
  }

  async exec(message: FireMessage) {
    await message.channel.send("https://fire-is-the.best/vote");
  }
}
