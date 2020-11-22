import { FireMessage } from "../../lib/extensions/message";
import { Listener } from "../../lib/util/listener";
import { Command } from "../../lib/util/command";

export default class CommandBlocked extends Listener {
  constructor() {
    super("commandBlocked", {
      emitter: "commandHandler",
      event: "commandBlocked",
    });
  }

  async exec(message: FireMessage, command: Command, reason: string) {
    if (reason == "owner") return await message.error("COMMAND_OWNER_ONLY");
    else if (reason == "guild")
      return await message.error("COMMAND_GUILD_ONLY");
    else if (reason == "premium")
      return await message.error("COMMAND_PREMIUM_ONLY");
    else if (reason == "experimentlock")
      return await message.error("COMMAND_EXPERIMENT_REQUIRED");
    else if (reason == "accountage")
      return await message.error("COMMAND_ACCOUNT_TOO_YOUNG");
    else if (reason == "guildlock")
      return await message.error("COMMAND_GUILD_LOCKED");
  }
}
