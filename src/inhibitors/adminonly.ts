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
    if (
      message.guild &&
      (message.guild.settings.get(
        "commands.adminonly",
        []
      ) as string[]).includes(message.channel.id)
    )
      return !message.member.isAdmin();
    return false;
  }
}
