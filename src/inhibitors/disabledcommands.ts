import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";
import { Command } from "../../lib/util/command";

export default class DisabledCommandsInhibitor extends Inhibitor {
  constructor() {
    super("disabledcommands", {
      reason: "locallydisabled",
      priority: 4,
    });
  }

  exec(message: FireMessage, command: Command) {
    if (
      message.guild &&
      (message.guild.settings.get(
        "disabled.commands",
        []
      ) as string[]).includes(command.id)
    )
      return !message.member.isModerator(message.channel);
    return false;
  }
}
