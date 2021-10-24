import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Inhibitor } from "@fire/lib/util/inhibitor";
import { Command } from "@fire/lib/util/command";

export default class SlashOnlyInhibitor extends Inhibitor {
  constructor() {
    super("slashonly", {
      reason: "slashonly",
      type: "post",
      priority: 10,
    });
  }

  // Stops a command from running if not using slash commands
  async exec(
    message: FireMessage | ApplicationCommandMessage,
    command: Command
  ) {
    if (process.env.USE_LITECORD == "true") return false;
    if (message.hasExperiment(93659956, 1)) return false;
    if (command.slashOnly && message instanceof FireMessage) return true;
    if (message.util?.parsed && message.util.parsed.prefix != "/")
      message.util.parsed.prefix = "/";
    return false;
  }
}
