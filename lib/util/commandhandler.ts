import {
  Category,
  CommandHandler as AkairoCommandHandler,
  CommandHandlerOptions,
  Constants,
} from "discord-akairo";
import { FireMessage } from "@fire/lib/extensions/message";
import { CommandUtil } from "./commandutil";
import { Collection } from "discord.js";
import { Fire } from "@fire/lib/Fire";
import { Command } from "./command";

const { CommandHandlerEvents } = Constants;

export class CommandHandler extends AkairoCommandHandler {
  categories: Collection<string, Category<string, Command>>;
  commandUtils: Collection<string, CommandUtil>;
  modules: Collection<string, Command>;
  client: Fire;

  constructor(client: Fire, options: CommandHandlerOptions) {
    super(client, options);
  }

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

  async handle(message: FireMessage) {
    if (message.webhookID || message.author?.bot) return false;

    if (this.commandUtil) {
      if (this.commandUtils.has(message.id)) {
        message.util = this.commandUtils.get(message.id);
      } else {
        message.util = new CommandUtil(this, message);
        this.commandUtils.set(message.id, message.util);
      }
    }

    return await super.handle(message);
  }

  setup() {
    this.client.once("ready", () => {
      this.client.on("message", async (m: FireMessage) => {
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
                .reactionHandler(o.paginator.emojis.close, null)
                .catch(() => {});
            if (this.handleEdits) this.handle(m);
          }
        );
      }
    });
  }
}
