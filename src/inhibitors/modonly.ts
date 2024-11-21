import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Inhibitor } from "@fire/lib/util/inhibitor";
import { Snowflake } from "discord-api-types/globals";
import { GuildChannel } from "discord.js";

export default class ModOnlyInhibitor extends Inhibitor {
  constructor() {
    super("modonly", {
      reason: "modonly",
      priority: 4,
      type: "pre",
    });
  }

  async exec(message: FireMessage) {
    if (
      message.guild &&
      (message.guild.settings
        .get<Snowflake[]>("commands.modonly", [])
        .includes(message.channelId) ||
        ((message.channel as GuildChannel).parentId &&
          message.guild.settings
            .get<Snowflake[]>("commands.modonly", [])
            .includes((message.channel as GuildChannel).parentId)))
    ) {
      if (message.member.isSuperuser()) return false;
      if (
        (message instanceof ApplicationCommandMessage ||
          message instanceof ContextCommandMessage) &&
        message.command.ephemeral
      )
        return false;
      const cantRun = !message.member.isModerator(message.channel);
      if (
        cantRun &&
        (message instanceof ApplicationCommandMessage ||
          message instanceof ContextCommandMessage)
      ) {
        if ((message.flags & 64) != 64)
          (message as ApplicationCommandMessage).flags = 64;
        return false;
      } else return cantRun;
    }
    return false;
  }
}
