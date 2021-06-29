import { SlashCommandMessage } from "@fire/lib/extensions/slashcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Inhibitor } from "@fire/lib/util/inhibitor";
import { Command } from "@fire/lib/util/command";

export default class DisabledCommandsInhibitor extends Inhibitor {
  constructor() {
    super("disabledcommands", {
      reason: "locallydisabled",
      type: "post",
      priority: 4,
    });
  }

  exec(message: FireMessage, command: Command) {
    const channel =
      message instanceof SlashCommandMessage
        ? message.realChannel
        : message.channel;
    if (
      message.guild &&
      message.guild.settings
        .get<string[]>("disabled.commands", [])
        .includes(command?.id)
    )
      return !message.member.isModerator(channel);
    return false;
  }
}
