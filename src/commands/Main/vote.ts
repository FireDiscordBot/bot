import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class Vote extends Command {
  constructor() {
    super("vote", {
      description: (language: Language) =>
        language.get("VOTE_COMMAND_DESCRIPTION"),
      aliases: ["dbl", "top.gg", "dboats", "discord.boats"],
      clientPermissions: ["SEND_MESSAGES"],
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage) {
    await message.channel.send(
      `<https://fire-is-the.best/${
        message.util?.parsed?.alias == "vote" ? "vote" : ""
      }>`
    );
  }
}
