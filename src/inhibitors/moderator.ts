import { FireMessage } from "@fire/lib/extensions/message";
import { Inhibitor } from "@fire/lib/util/inhibitor";
import { Command } from "@fire/lib/util/command";

export default class ModeratorInhibitor extends Inhibitor {
  constructor() {
    super("moderator", {
      reason: "moderator",
      priority: 8,
    });
  }

  exec(message: FireMessage, command?: Command) {
    if ((!message.guild || !message.member) && command?.moderatorOnly)
      return true;
    else if (!message.guild) return false;
    return command?.moderatorOnly && !message.member.isModerator();
  }
}
