import { SlashCommandMessage } from "../../lib/extensions/slashCommandMessage";
import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";

export default class AdminOnlyInhibitor extends Inhibitor {
  constructor() {
    super("adminonly", {
      reason: "adminonly",
      priority: 5,
    });
  }

  exec(message: FireMessage) {
    const channel =
      message instanceof SlashCommandMessage
        ? message.realChannel
        : message.channel;
    if (
      message.guild &&
      (message.guild.settings.get(
        "commands.adminonly",
        []
      ) as string[]).includes(channel.id)
    ) {
      if (message.member.isSuperuser()) return false;
      if (message instanceof SlashCommandMessage && message.command.ephemeral)
        return false;
      return !message.member.isAdmin(channel);
    }
    return false;
  }
}
