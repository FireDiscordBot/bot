import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Inhibitor } from "@fire/lib/util/inhibitor";

export default class Silent extends Inhibitor {
  constructor() {
    super("silent", {
      reason: "silent",
      type: "post",
      priority: 2,
    });
  }

  async exec(message: FireMessage, command?: Command) {
    if (command?.id != "quote" && message.silent && message.guild)
      await message
        .delete({
          reason: message.guild.language.get("COMMAND_SILENT_DELETE_REASON"),
        })
        .catch(() => {});
    return false;
  }
}
