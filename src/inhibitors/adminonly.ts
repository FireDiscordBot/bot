import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";

export default class AdminOnlyInhibitor extends Inhibitor {
  constructor() {
    super("adminonly", {
      reason:
        "Makes commands only usable by administrators in specific channels",
      priority: 5,
    });
  }

  exec(message: FireMessage) {
    if (
      (this.client.settings.get(
        message.guild.id,
        "commands.adminonly",
        []
      ) as string[]).includes(message.channel.id)
    )
      return message.member.isAdmin();
    return true;
  }
}
