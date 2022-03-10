import { FireMessage } from "@fire/lib/extensions/message";
import { Inhibitor } from "@fire/lib/util/inhibitor";
import { Command } from "@fire/lib/util/command";

export default class DisabledCommandsInhibitor extends Inhibitor {
  constructor() {
    super("disabledcommands", {
      reason: "locallydisabled",
      type: "post",
      priority: 4,
    });
  }

  async exec(message: FireMessage, command: Command) {
    if (message.author.isSuperuser()) return false;
    if (
      message.guild &&
      message.guild.settings
        .get<string[]>("disabled.commands", [])
        .includes(command?.id)
    )
      return !message.member.isModerator(message.channel);
    return false;
  }
}
