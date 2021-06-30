import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";
import { Command } from "@fire/lib/util/command";
import { ThreadChannel } from "discord.js";

export default class CommandBlocked extends Listener {
  constructor() {
    super("commandBlocked", {
      emitter: "commandHandler",
      event: "commandBlocked",
    });
  }

  async exec(message: FireMessage, _: Command, reason: string) {
    if (message.channel instanceof ThreadChannel) {
      const checks = await this.client.commandHandler
        .preThreadChecks(message)
        .catch(() => {});
      if (!checks) return;
    }

    if (reason == "500") return await message.error("COMMAND_ERROR_500");
    else if (reason == "owner")
      return await message.error("COMMAND_OWNER_ONLY");
    else if (reason == "superuser")
      return await message.error("COMMAND_SUPERUSER_ONLY");
    else if (reason == "moderator")
      return await message.error("COMMAND_MODERATOR_ONLY");
    else if (reason == "guild")
      return await message.error(
        "COMMAND_GUILD_ONLY",
        this.client.config.inviteLink
      );
    else if (reason == "premium")
      return await message.error("COMMAND_PREMIUM_GUILD_ONLY");
    else if (reason == "experimentlock")
      return await message.error("COMMAND_EXPERIMENT_REQUIRED");
    else if (reason == "accountage")
      return await message.error("COMMAND_ACCOUNT_TOO_YOUNG");
    else if (reason == "guildlock")
      return await message.error("COMMAND_GUILD_LOCKED");
    else if (reason == "cache")
      return await message.error("COMMAND_ERROR_CACHE");
  }
}
