import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class BadName extends Command {
  constructor() {
    super("badname", {
      description: (language: Language) =>
        language.get("BADNAME_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_NICKNAMES],
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.MANAGE_NICKNAMES,
      ],
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
      moderatorOnly: true,
      restrictTo: "guild",
    });
  }

  exec(message: FireMessage, args: { name: string }) {
    const current = message.guild.settings.get<string>("utils.badname", null);

    if (current == args.name) return message.success("BADNAME_NO_CHANGES");

    if (args.name)
      message.guild.settings.set<string>("utils.badname", args.name);
    else message.guild.settings.delete("utils.badname");

    return args.name
      ? message.success("BADNAME_SET", { name: args.name })
      : message.success("BADNAME_RESET");
  }
}
