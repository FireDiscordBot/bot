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
      message.guild &&
      (message.guild.settings.get("commands.modonly", []) as string[]).includes(
        message.channel.id
      )
    ) {
      if (message.member.isSuperuser()) return false;
      return !message.member.isModerator();
    }
    return false;
  }
}
