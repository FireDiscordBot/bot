import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
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

  async exec(message: FireMessage) {
    if (
      message instanceof ApplicationCommandMessage &&
      (message.flags & 64) == 64
    )
      return false;
    if (
      message.guild &&
      message.guild.settings
        .get<string[]>("commands.modonly", [])
        .includes(message.channelId)
    ) {
      if (message.member.isSuperuser()) return false;
      if (
        message instanceof ApplicationCommandMessage &&
        message.command.ephemeral
      )
        return false;
      return !message.member.isModerator(message.channel);
    }
    return false;
  }
}
