import {
  Category,
  CommandHandler as AkairoCommandHandler,
  CommandHandlerOptions,
  Constants,
} from "discord-akairo";
import {
  DiscordAPIError,
  ThreadChannel,
  Collection,
  Channel,
} from "discord.js";
import { ApplicationCommandMessage } from "../extensions/appcommandmessage";
import { ContextCommandMessage } from "../extensions/contextcommandmessage";
import { CommandUtil, ParsedComponentData } from "./commandutil";
import { FireMessage } from "@fire/lib/extensions/message";
import { Fire } from "@fire/lib/Fire";
import { Command } from "./command";

const { CommandHandlerEvents } = Constants;
const allowedTypes = ["DEFAULT", "REPLY"];

// TODO: replace as unknown when fully switched to slash

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
    if (command.typing) message.channel.sendTyping();

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
  }

  async runSlashCommand(
    message: ApplicationCommandMessage,
    command: Command,
    args: Record<string, unknown>
  ) {
    await message.channel.ack((message.flags & 64) != 0);

    this.emit(CommandHandlerEvents.COMMAND_STARTED, message, command, args);
    try {
      // all commands will eventually be switched to use run instead of exec
      // for now, this is the best way I could find to determine whether or not it's the
      // Command class method or whether it has been overwritten
      const ret = !command.run.toString().includes("method_must_be_overwritten")
        ? await command.run(message, args)
        : await command.exec(message as unknown as FireMessage, args);
      this.emit(
        CommandHandlerEvents.COMMAND_FINISHED,
        message,
        command,
        args,
        ret
      );
      return true;
    } catch (err) {
      this.emit("commandError", message, command, args, err);
      return false;
    }
  }

  async handle(message: FireMessage) {
    if (
      message.webhookId ||
      message.author?.bot ||
      (message instanceof FireMessage && !message.channel) ||
      !allowedTypes.includes(message.type)
    )
      return false;

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
      if (parsed.command)
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

  async handleSlash(message: ApplicationCommandMessage) {
    try {
      if (await this.runAllTypeInhibitorsSlash(message)) return false;

      if (this.commandUtils.has(message.id))
        message.util = this.commandUtils.get(message.id);
      else {
        message.util = new CommandUtil(this, message);
        this.commandUtils.set(message.id, message.util);
      }

      if (await this.runPreTypeInhibitorsSlash(message)) return false;

      const parsed = (message.util.parsed = {
        alias: message.command.id,
        command: message.command,
        afterPrefix: "",
        content: "",
        prefix: "/",
      });

      let ran = false;
      if (parsed.command)
        ran = await this.handleDirectSlashCommand(message, parsed.command);

      if (ran === false) {
        this.emit(CommandHandlerEvents.MESSAGE_INVALID, message);
        return false;
      }

      return ran;
    } catch (err) {
      if (err instanceof DiscordAPIError && err.code == 10007) return null;

      this.emitError(err, message as unknown as FireMessage);
      return null;
    }
  }

  async runAllTypeInhibitorsSlash(message: ApplicationCommandMessage) {
    const reason = this.inhibitorHandler
      ? await this.inhibitorHandler.test(
          "all",
          message as unknown as FireMessage,
          message.command
        )
      : null;

    if (reason != null) {
      this.emit(
        CommandHandlerEvents.COMMAND_BLOCKED,
        message,
        message.command,
        reason
      );
    } else if (this.blockClient && message.author.id === this.client.user.id) {
      this.emit(
        CommandHandlerEvents.COMMAND_BLOCKED,
        message,
        message.command,
        Constants.BuiltInReasons.CLIENT
      );
    } else if (this.blockBots && message.author.bot) {
      this.emit(
        CommandHandlerEvents.COMMAND_BLOCKED,
        message,
        message.command,
        Constants.BuiltInReasons.BOT
      );
      // TODO: change hasPrompt to use FakeChannel (or just remove it since I don't use prompts)
    } else if (
      this.hasPrompt(message.channel as unknown as Channel, message.author)
    ) {
      this.emit(CommandHandlerEvents.IN_PROMPT, message);
    } else {
      return false;
    }

    return true;
  }

  async runPreTypeInhibitorsSlash(message: ApplicationCommandMessage) {
    const reason = this.inhibitorHandler
      ? await this.inhibitorHandler.test(
          "pre",
          message as unknown as FireMessage
        )
      : null;

    if (reason != null) {
      this.emit(
        CommandHandlerEvents.COMMAND_BLOCKED,
        message,
        message.command,
        reason
      );
    } else {
      return false;
    }

    return true;
  }

  async handleDirectSlashCommand(
    message: ApplicationCommandMessage,
    command: Command,
    ignore = false
  ) {
    let key;
    try {
      if (
        !ignore &&
        (await this.runPostTypeInhibitors(
          message as unknown as FireMessage,
          command
        ))
      )
        return false;

      await command.before(message as unknown as FireMessage);

      const args = await command.parseSlash(message);

      if (!ignore) {
        if (command.lock)
          key = command.lock(message as unknown as FireMessage, args);
        if (this.client.util.isPromise(key)) await key;
        if (key) {
          if (command.locker.has(key)) {
            key = null;
            this.emit(CommandHandlerEvents.COMMAND_LOCKED, message, command);
            return true;
          }

          command.locker.add(key);
        }
      }

      await this.runSlashCommand(message, command, args);
    } catch (err) {
      this.emitError(err, message as unknown as FireMessage, command);
      return null;
    } finally {
      if (key) command.locker.delete(key);
    }
  }

  async preThreadChecks(message: FireMessage | ApplicationCommandMessage) {
    if (
      message instanceof ApplicationCommandMessage ||
      message instanceof ContextCommandMessage
    )
      return; // only needed for typing compatibility

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

    return true;
  }

  setup() {
    this.client.once("ready", () => {
      this.client.on("messageCreate", async (m: FireMessage) => {
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
            if (o.paginator) this.client.util.paginators.delete(o.id);
            if (this.handleEdits) this.handle(m);
          }
        );
      }
    });
  }
}
