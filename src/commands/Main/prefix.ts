import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Prefix extends Command {
  constructor() {
    super("prefix", {
      description: (language: Language) =>
        language.get("PREFIX_COMMAND_DESCRIPTION"),
      userPermissions: ["MANAGE_GUILD"],
      args: [
        {
          id: "prefix",
          type: "string",
          required: true,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  async exec(message: FireMessage, args: { prefix?: string }) {
    if (!args.prefix) return await message.error("PREFIX_MISSING_ARG");
    if (args.prefix.toLowerCase() == "fire ")
      return await message.error("PREFIX_GLOBAL");
    const current: string = message.guild.settings.get("config.prefix", "$");
    if (args.prefix.toLowerCase() == current.toLowerCase())
      return await message.error("PREFIX_ALREADY_SET");
    message.guild.settings.set("config.prefix", args.prefix);
    return await message.success("PREFIX_SET", current, args.prefix);
  }
}
