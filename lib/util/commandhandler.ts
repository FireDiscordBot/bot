import { Fire } from "@fire/lib/Fire";
import { FireMessage } from "@fire/lib/extensions/message";
import {
  CommandHandler as AkairoCommandHandler,
  Category,
  CommandHandlerOptions,
  Constants,
} from "discord-akairo";
import { Collection, DiscordAPIError, ThreadChannel } from "discord.js";
import { ApplicationCommandMessage } from "../extensions/appcommandmessage";
import { ContextCommandMessage } from "../extensions/contextcommandmessage";
import { Command } from "./command";
import { CommandUtil, ParsedComponentData } from "./commandutil";
import { UseExec, UseRun } from "./constants";

const { CommandHandlerEvents } = Constants;
const allowedTypes = ["DEFAULT", "REPLY"];

export type SlashArgumentTypeCaster = (
  message: ApplicationCommandMessage | ContextCommandMessage,
  phrase: string
) => any;

// TODO: replace as unknown when fully switched to slash

export class CommandHandler extends AkairoCommandHandler {
  declare categories: Collection<string, Category<string, Command>>;
  declare commandUtils: Collection<string, CommandUtil>;
  declare modules: Collection<string, Command>;
  declare client: Fire;

  constructor(client: Fire, options: CommandHandlerOptions) {
    super(client, options);
  }

  getCategories() {
    // categories with lowercase names are not actual categories
    return this.categories.filter(
      (c) => c.id && c.id[0].toUpperCase() == c.id[0]
    );
  }

  async runCommand(
    message: FireMessage,
    command: Command,
    args: Record<string, unknown>
  ): Promise<void> {
    if (command.typing) message.channel.sendTyping();

    this.emit(CommandHandlerEvents.COMMAND_STARTED, message, command, args);
    try {
      let ret: any;
      try {
        // always attempt to use exec first for message commands
        ret = await command.exec(message, args);
      } catch (err) {
        if (err instanceof UseRun) {
          // if we got here, the slash only inhibitor returned false
          // meaning the user is allowed run slashOnly commands via msg commands
          // so we call the run method instead which may break but that's what you get for
          // not using slash commands
          ret = await command.run(
            message as unknown as ApplicationCommandMessage,
            args
          );
        } else throw err;
      }
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
    message: ApplicationCommandMessage | ContextCommandMessage,
    command: Command,
    args: Record<string, unknown>
  ) {
    await message.channel.ack((message.flags & 64) != 0);

    this.emit(CommandHandlerEvents.COMMAND_STARTED, message, command, args);
    try {
      let ret: any;
      try {
        // always attempt to use run first for slash commands
        ret = await command.run(message, args);
      } catch (err) {
        if (err instanceof UseExec)
          ret = await command.exec(message as unknown as FireMessage, args);
        else throw err;
      }
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

    if (!message.content && message.hasExperiment(3901360561, 1))
      message.content =
        message.attachments.first()?.description ?? message.content;

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

  async handleSlash(
    message: ApplicationCommandMessage | ContextCommandMessage
  ) {
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
        afterPrefix: message.command.id,
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

  async runAllTypeInhibitorsSlash(
    message: ApplicationCommandMessage | ContextCommandMessage
  ) {
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
    } else {
      return false;
    }

    return true;
  }

  async runPreTypeInhibitorsSlash(
    message: ApplicationCommandMessage | ContextCommandMessage
  ) {
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
    message: ApplicationCommandMessage | ContextCommandMessage,
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

      const args = await command.parseSlash(message).catch((e) => e);
      if (args instanceof Error) {
        this.emit("commandError", message, command, {}, args);
        return null;
      } else if (args == null) return null;

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
            if (this.handleEdits) {
              m.sentUpsell = false;
              this.handle(m);
            }
          }
        );
      }
    });
  }
}
