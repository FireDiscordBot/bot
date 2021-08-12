import { ApplicationCommandMessage } from "@fire/lib/extensions/slashcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Inhibitor } from "@fire/lib/util/inhibitor";

export default class AdminOnlyInhibitor extends Inhibitor {
  constructor() {
    super("adminonly", {
      reason: "adminonly",
      priority: 5,
      type: "pre",
    });
  }

  exec(message: FireMessage) {
    if (
      message.guild &&
      message.guild.settings
        .get<string[]>("commands.adminonly", [])
        .includes(message.channel.id)
    ) {
      if (message.member.isSuperuser()) return false;
      if (
        message instanceof ApplicationCommandMessage &&
        message.command.ephemeral
      )
        return false;
      return !message.member.isAdmin(message.channel);
    }
    return false;
  }
}
