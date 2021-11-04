import { Command } from "@fire/lib/util/command";

export default class SelectDiscord extends Command {
  constructor() {
    super("select-discord", {
      args: [],
      enableSlashCommand: false,
      restrictTo: "all",
      parent: "select",
      slashOnly: true,
      group: true,
    });
  }

  async exec() {
    return; // subcommand group isn't usable
  }
}
