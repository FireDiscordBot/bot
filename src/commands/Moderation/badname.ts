import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class BadName extends Command {
  constructor() {
    super("badname", {
      description: (language: Language) =>
        language.get("BADNAME_COMMAND_DESCRIPTION"),
      userPermissions: ["MANAGE_NICKNAMES"],
      clientPermissions: ["SEND_MESSAGES", "MANAGE_NICKNAMES"],
      args: [
        {
          id: "name",
          type: "string",
          match: "rest",
          default: null,
          required: false,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  exec(message: FireMessage, args: { name: string }) {
    const current = message.guild.settings.get("utils.badname", null);

    if (current == args.name) return message.success("BADNAME_NO_CHANGES");

    message.guild.settings.set("utils.badname", args.name);

    return args.name
      ? message.success("BADNAME_SET", args.name)
      : message.success("BADNAME_RESET");
  }
}
