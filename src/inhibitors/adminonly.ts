import { SlashCommandMessage } from "@fire/lib/extensions/slashcommandmessage";
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
    const channel =
      message instanceof SlashCommandMessage
        ? message.realChannel
        : message.channel;
    if (
      message.guild &&
      message.guild.settings
        .get<string[]>("commands.adminonly", [])
        .includes(channel.id)
    ) {
      if (message.member.isSuperuser()) return false;
      if (message instanceof SlashCommandMessage && message.command.ephemeral)
        return false;
      return !message.member.isAdmin(channel);
    }
    return false;
  }
}
