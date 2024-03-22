import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";

export default class Admin extends Command {
  constructor() {
    super("admin", {
      description:
        "this literally does not get shown and I do not care enough to set one properly",
      enableSlashCommand: true,
      superuserOnly: true,
      restrictTo: "all",
      slashOnly: true,
      group: true,
    });
  }

  // base command isn't usable with subcommands
  async exec(message: FireMessage) {}
}
