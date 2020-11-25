import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";

export default class GuildLockInhibitor extends Inhibitor {
  constructor() {
    super("guildlock", {
      reason: "guildlock",
      priority: 4,
    });
  }

  exec(message: FireMessage) {
    const command = message.util?.parsed?.command;
    if (
      command &&
      command.guilds?.length &&
      !command.guilds.includes(message.guild?.id)
    )
      return true;
    return false;
  }
}
