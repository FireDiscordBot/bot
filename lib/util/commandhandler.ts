import {
  Category,
  CommandHandler as AkairoCommandHandler,
  CommandHandlerOptions,
  Constants,
} from "discord-akairo";
import { DiscordAPIError, ThreadChannel, Collection } from "discord.js";
import { CommandUtil, ParsedComponentData } from "./commandutil";
import { FireMessage } from "@fire/lib/extensions/message";
import { Fire } from "@fire/lib/Fire";
import { Command } from "./command";

const { CommandHandlerEvents } = Constants;

export class CommandHandler extends AkairoCommandHandler {
  declare categories: Collection<string, Category<string, Command>>;
  declare commandUtils: Collection<string, CommandUtil>;
  declare modules: Collection<string, Command>;
  declare client: Fire;

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

    const isThreadMember =
      message.channel instanceof ThreadChannel &&
      message.channel.members.cache.has(this.client.user.id);

    if (
      message.channel instanceof ThreadChannel &&
      message.channel.joinable &&
      !isThreadMember
    ) {
      const joined = await message.channel.join().catch(() => {});
      if (!joined) return;
    } else if (
      message.channel instanceof ThreadChannel &&
      !message.channel.joinable &&
      !isThreadMember
    )
      return;

    try {
      if (this.fetchMembers && message.guild && !message.member)
        await message.guild.members.fetch(message.author);

      if (await this.runAllTypeInhibitors(message)) return false;

      if (this.commandUtil) {
        if (this.commandUtils.has(message.id))
          message.util = this.commandUtils.get(message.id);
        else {
          message.util = new CommandUtil(this, message);
          this.commandUtils.set(message.id, message.util);
        }
      }

      if (await this.runPreTypeInhibitors(message)) return false;

      let parsed = await this.parseCommand(message);
      if (!parsed.command) {
        const overParsed = await this.parseCommandOverwrittenPrefixes(message);
        if (
          overParsed.command ||
          (parsed.prefix == null && overParsed.prefix != null)
        ) {
          parsed = overParsed;
        }
      }

      if (this.commandUtil) message.util.parsed = parsed as ParsedComponentData;

      let ran = false;
      if (!parsed.command)
        ran = await this.handleRegexAndConditionalCommands(message);
      else
        ran = await this.handleDirectCommand(
          message,
          parsed.content,
          parsed.command
        );

      if (ran === false) {
        this.emit(CommandHandlerEvents.MESSAGE_INVALID, message);
        return false;
      }

      return ran;
    } catch (err) {
      if (err instanceof DiscordAPIError && err.code == 10007) return null;

      this.emitError(err, message);
      return null;
    }
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
