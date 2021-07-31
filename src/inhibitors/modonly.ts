import { SlashCommandMessage } from "@fire/lib/extensions/slashcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Inhibitor } from "@fire/lib/util/inhibitor";

export default class ModOnlyInhibitor extends Inhibitor {
  constructor() {
    super("modonly", {
      reason: "modonly",
      priority: 4,
      type: "pre",
    });
  }

  exec(message: FireMessage) {
    if (message instanceof SlashCommandMessage && (message.flags & 64) == 64)
      return false;
    if (
      message.guild &&
      message.guild.settings
        .get<string[]>("commands.modonly", [])
        .includes(message.channel.id)
    ) {
      if (message.member.isSuperuser()) return false;
      if (message instanceof SlashCommandMessage && message.command.ephemeral)
        return false;
      return !message.member.isModerator(message.channel);
    }
    return false;
  }
}
