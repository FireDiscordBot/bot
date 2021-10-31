import {
  CommandInteractionOption,
  BitFieldResolvable,
  PermissionString,
} from "discord.js";
import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
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
          autocomplete: true,
          required: true,
          default: null,
        },
      ],
      enableSlashCommand: true,
      moderatorOnly: true,
      restrictTo: "guild",
      slashOnly: true,
    });
  }

  async autocomplete(
    interaction: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ) {
    if (focused.value)
      return this.client.commandHandler.modules
        .filter((cmd) => this.filter(cmd, interaction))
        .map((cmd) => ({ name: cmd.id.replace("-", " "), value: cmd.id }))
        .slice(0, 25);
    return this.client.commandHandler.modules
      .filter((cmd) => this.filter(cmd, interaction))
      .map((cmd) => ({ name: cmd.id.replace("-", " "), value: cmd.id }))
      .slice(0, 25);
  }

  private filter(command: Command, message: ApplicationCommandMessage) {
    if (!(command instanceof Command)) return false;
    else if (command.hidden && !message.author.isSuperuser()) return false;
    else if (command.ownerOnly && this.client.ownerID != message.author.id)
      return false;
    else if (command.superuserOnly && !message.author.isSuperuser())
      return false;
    else if (
      command.moderatorOnly &&
      !message.member?.isModerator(message.channel)
    )
      return false;
    else if (
      command.guilds.length &&
      !command.guilds.includes(message.guild?.id)
    )
      return false;
    return true;
  }

  async run(command: ApplicationCommandMessage, args: { command?: Command }) {
    if (!args.command) return await command.error("COMMAND_NO_ARG");
    if (unableToDisable.includes(args.command.id))
      return await command.error("COMMAND_DISABLE_FORBIDDEN");
    let current = command.guild.settings.get<string[]>("disabled.commands", []);
    if (current.includes(args.command.id)) {
      current = current.filter(
        (command) =>
          command != args.command.id &&
          this.client.commandHandler.modules.has(command)
      );
      if (current.length)
        command.guild.settings.set<string[]>("disabled.commands", current);
      else command.guild.settings.delete("disabled.commands");
      return await command.success("COMMAND_ENABLE", {
        command: args.command.id,
      });
    } else {
      current.push(args.command.id);
      command.guild.settings.set<string[]>("disabled.commands", current);
      return await command.success("COMMAND_DISABLE", {
        command: args.command.id,
      });
    }
  }
}
