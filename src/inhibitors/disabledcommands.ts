import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";

export default class DisabledCommandsInhibitor extends Inhibitor {
  constructor() {
    super("disabledcommands", {
      reason: "locallydisabled",
      priority: 4,
    });
  }

  exec(message: FireMessage) {
    if (
      (message.guild.settings.get(
        "disabled.commands",
        []
      ) as string[]).includes(message.util?.parsed.command.id)
    )
      return message.member.isModerator(message.channel);
    return false;
  }
}
