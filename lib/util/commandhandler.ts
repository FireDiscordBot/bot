import {
  Category,
  CommandHandler as AkairoCommandHandler,
  CommandHandlerOptions,
  Constants,
} from "discord-akairo";
import { FireMessage } from "@fire/lib/extensions/message";
import { Collection } from "discord.js";
import { Command } from "./command";
import { Fire } from "@fire/lib/Fire";

const { CommandHandlerEvents } = Constants;

export class CommandHandler extends AkairoCommandHandler {
  categories: Collection<string, Category<string, Command>>;
  modules: Collection<string, Command>;
  client: Fire;

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
  async runCommand(
    message: FireMessage,
    command: Command,
    args: any[]
  ): Promise<void> {
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

  setup() {
    this.client.once("ready", () => {
      this.client.on("message", async (m) => {
        if (m.partial) await m.fetch().catch(() => {});
        if (!m.partial) this.handle(m);
      });

      if (this.handleEdits) {
        this.client.on(
          "messageUpdate",
          async (o: FireMessage, m: FireMessage) => {
            if (o.partial) return;
            try {
              if (m.partial) m = (await m.fetch()) as FireMessage;
            } catch {
              return;
            }
            if (o.content.trim() == m.content.trim()) return;
            if (o.paginator)
              await o.paginator
                .handler(o.paginator.emojis.close, null)
                .catch(() => {});
            if (this.handleEdits) this.handle(m);
          }
        );
      }
    });
  }
}
