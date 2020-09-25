import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class AutoDecancer extends Command {
  constructor() {
    super("autodecancer", {
      description: (language: Language) =>
        language.get("AUTODECANCER_COMMAND_DESCRIPTION"),
      userPermissions: ["MANAGE_NICKNAMES"],
      clientPermissions: ["SEND_MESSAGES", "MANAGE_NICKNAMES"],
    });
  }

  async exec(message: FireMessage) {
    const current = this.client.settings.get(
      message.guild.id,
      "mod.autodecancer",
      false
    );
    this.client.settings.set(message.guild.id, "mod.autodecancer", !current);
    !current
      ? message.success("AUTODECANCER_ENABLED")
      : message.success("AUTODECANCER_DISABLED");
  }
}
