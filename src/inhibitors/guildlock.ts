import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";
import { Command } from "../../lib/util/command";

export default class GuildLockInhibitor extends Inhibitor {
  constructor() {
    super("guildlock", {
      reason: "guildlock",
      priority: 4,
    });
  }

  exec(message: FireMessage, command: Command) {
    if (!message.guild && command.guilds?.length) return true;
    if (
      command &&
      command.guilds?.length &&
      !command.guilds.includes(message.guild?.id)
    )
      return true;
    return false;
  }
}
