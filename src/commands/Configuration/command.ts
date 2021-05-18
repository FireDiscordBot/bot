import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

const unableToDisable = ["debug", "command"];

// great class name, ik
export default class CommandCommand extends Command {
  constructor() {
    super("command", {
      description: (language: Language) =>
        language.get("COMMAND_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "command",
          type: "command",
          required: true,
          default: null,
        },
      ],
      enableSlashCommand: true,
      moderatorOnly: true,
      restrictTo: "guild",
    });
  }

  async exec(message: FireMessage, args: { command?: Command }) {
    if (!args.command) return await message.error("COMMAND_NO_ARG");
    if (unableToDisable.includes(args.command.id))
      return await message.error("COMMAND_DISABLE_FORBIDDEN");
    let current = message.guild.settings.get(
      "disabled.commands",
      []
    ) as string[];
    if (current.includes(args.command.id)) {
      current = current.filter(
        (command) =>
          command != args.command.id &&
          this.client.commandHandler.modules.has(command)
      );
      if (current.length)
        message.guild.settings.set("disabled.commands", current);
      else message.guild.settings.delete("disabled.commands");
      return await message.success("COMMAND_ENABLE", args.command.id);
    } else {
      current.push(args.command.id);
      message.guild.settings.set("disabled.commands", current);
      return await message.success("COMMAND_DISABLE", args.command.id);
    }
  }
}
