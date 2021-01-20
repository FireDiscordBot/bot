import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class Vote extends Command {
  constructor() {
    super("vote", {
      description: (language: Language) =>
        language.get("VOTE_COMMAND_DESCRIPTION"),
      enableSlashCommand: false,
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage) {
    // TODO add back /vote (rn it just 404s)
    await message.channel.send(`<https://fire-is-the.best/>`);
  }
}
