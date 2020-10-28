import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";

export default class ModOnlyInhibitor extends Inhibitor {
  constructor() {
    super("modonly", {
      reason: "modonly",
      priority: 4,
    });
  }

  exec(message: FireMessage) {
    if (
      (message.guild.settings.get("commands.modonly", []) as string[]).includes(
        message.channel.id
      )
    )
      return !message.member.isModerator(message.channel);
    return false;
  }
}
