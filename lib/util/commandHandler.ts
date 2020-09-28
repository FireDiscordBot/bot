import {
  Category,
  CommandHandler as AkairoCommandHandler,
  CommandHandlerOptions,
  Constants,
} from "discord-akairo";
import { FireMessage } from "../extensions/message";
import { Command } from "./command";
import { Fire } from "../Fire";
import { Collection } from "discord.js";

const { CommandHandlerEvents } = Constants;

export class CommandHandler extends AkairoCommandHandler {
  client: Fire;
  categories: Collection<string, Category<string, Command>>;

  constructor(client: Fire, options: CommandHandlerOptions) {
    super(client, options);
  }

  /**
   * Runs a command.
   * @param {FireMessage} message - Message to handle.
   * @param {Command} command - Command to handle.
   * @param {any} args - Arguments to use.
   * @returns {Promise<void>}
   */
  async runCommand(message: FireMessage, command: Command, args: any[]) {
    if (command.typing) {
      message.channel.startTyping();
    }

    try {
      this.emit(CommandHandlerEvents.COMMAND_STARTED, message, command, args);
      try {
        const ret = await command.exec(message, args);
        this.emit(
          CommandHandlerEvents.COMMAND_FINISHED,
          message,
          command,
          args,
          ret
        );
      } catch (err) {
        this.emit("commandError", message, command, args, err);
      }
    } finally {
      if (command.typing) {
        message.channel.stopTyping();
      }
    }
  }
}
