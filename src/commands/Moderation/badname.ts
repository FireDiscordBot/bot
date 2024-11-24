import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class BadName extends Command {
  constructor() {
    super("badname", {
      description: (language: Language) =>
        language.get("BADNAME_COMMAND_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageNicknames],
      clientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageNicknames,
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

  async exec(message: FireMessage, args: { name: string }) {
    const current = message.guild.settings.get<string>("utils.badname", null);

    if (current == args.name) return message.success("BADNAME_NO_CHANGES");

    if (args.name)
      await message.guild.settings.set<string>(
        "utils.badname",
        args.name,
        message.author
      );
    else await message.guild.settings.delete("utils.badname", message.author);

    return args.name
      ? await message.success("BADNAME_SET", { name: args.name })
      : await message.success("BADNAME_RESET");
  }
}
