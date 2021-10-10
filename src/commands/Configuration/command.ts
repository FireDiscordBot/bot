import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Option } from "@fire/lib/interfaces/interactions";
import { FireGuild } from "@fire/lib/extensions/guild";
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

  async autocomplete(guild: FireGuild, option: Option) {
    if (option.value)
      return this.client.commandHandler.modules
        .filter(
          (cmd) =>
            cmd.id.includes(option.value.toString()) &&
            !unableToDisable.includes(cmd.id) &&
            (cmd.requiresExperiment
              ? guild.hasExperiment(
                  cmd.requiresExperiment.id,
                  cmd.requiresExperiment.bucket
                )
              : true)
        )
        .map((cmd) => cmd.id.replace("-", " "))
        .slice(0, 20);
    return this.client.commandHandler.modules
      .filter(
        (cmd) =>
          !unableToDisable.includes(cmd.id) &&
          (cmd.requiresExperiment
            ? guild.hasExperiment(
                cmd.requiresExperiment.id,
                cmd.requiresExperiment.bucket
              )
            : true)
      )
      .map((cmd) => cmd.id.replace("-", " "))
      .slice(0, 20);
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
