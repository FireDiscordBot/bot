import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Inhibitor } from "@fire/lib/util/inhibitor";

export default class GuildLockInhibitor extends Inhibitor {
  constructor() {
    super("guildlock", {
      reason: "guildlock",
      type: "post",
      priority: 4,
    });
  }

  async exec(message: FireMessage, command: Command) {
    if (!message.guild && command?.guilds?.length) return true;
    if (
      command &&
      command.guilds?.length &&
      !command.guilds.includes(message.guild?.id)
    )
      return true;
    return false;
  }
}
