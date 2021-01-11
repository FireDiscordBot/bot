import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";
import { Command } from "../../lib/util/command";

export default class ModeratorInhibitor extends Inhibitor {
  constructor() {
    super("moderator", {
      reason: "moderator",
      priority: 8,
    });
  }

  exec(message: FireMessage, command?: Command) {
    if (!message.guild || !message.member) return true;
    return command?.moderatorOnly && !message.member.isModerator();
  }
}
