import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class Invite extends Command {
  constructor() {
    super("invite", {
      description: (language: Language) =>
        language.get("INVITE_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES"],
    });
  }

  async exec(message: FireMessage) {
    await message.channel.send("<https://inv.wtf/bot>");
  }
}
