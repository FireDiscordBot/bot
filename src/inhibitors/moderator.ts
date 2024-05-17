import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Inhibitor } from "@fire/lib/util/inhibitor";

export default class ModeratorInhibitor extends Inhibitor {
  constructor() {
    super("moderator", {
      reason: "moderator",
      type: "post",
      priority: 8,
    });
  }

  async exec(message: FireMessage, command?: Command) {
    if ((!message.guild || !message.member) && command?.moderatorOnly)
      return true;
    else if (!message.guild) return false;
    return command?.moderatorOnly && !message.member.isModerator();
  }
}
