import { Command } from "@fire/lib/util/command";

export default class SelectDemo extends Command {
  constructor() {
    super("select-demo", {
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
