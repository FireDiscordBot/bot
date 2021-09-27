import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
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

  async exec(message: FireMessage) {
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
      const cantRun = !message.member.isAdmin(message.channel);
      if (cantRun && message instanceof ApplicationCommandMessage) {
        if ((message.flags & 64) != 64)
          (message as ApplicationCommandMessage).flags = 64;
        return false;
      } else return cantRun;
    }
    return false;
  }
}
