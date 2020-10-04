import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";

export default class DisabledCommandsInhibitor extends Inhibitor {
  constructor() {
    super("disabledcommands", {
      reason: "Prevents disabled commands from being used by non-moderators",
      priority: 4,
    });
  }

  exec(message: FireMessage) {
    if (
      (this.client.settings.get(
        message.guild.id,
        "disabled.commands",
        []
      ) as string[]).includes(message.util?.parsed.command.id)
    )
      return message.member.isModerator(message.channel);
    return true;
  }
}
