import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { MessageLinkMatch } from "@fire/lib/interfaces/messages";
import { constants } from "@fire/lib/util/constants";
import { MessageIterator } from "@fire/lib/util/iterators";
import { Listener } from "@fire/lib/util/listener";
import Quote from "@fire/src/commands/Utilities/quote";
import RemindersCreate from "@fire/src/commands/Utilities/reminders-create";
import { Constants } from "discord-akairo";
import { parseTime } from "../arguments/time";

const { regexes } = constants;
const { CommandHandlerEvents } = Constants;
let mentionRegex: RegExp;

export default class MessageInvalid extends Listener {
  botQuoteRegex: RegExp;
  remindFlag: string;

  constructor() {
    super("messageInvalid", {
      emitter: "commandHandler",
      event: "messageInvalid",
    });
    this.botQuoteRegex =
      /.{1,25}\s?quote (?:https?:\/\/)?(?:(?:ptb|canary|development|staging)\.)?discord(?:app)?\.com?\/channels\/(?:\d{15,21}\/?){3}/gim;
    this.remindFlag =
      {
        development: "--devremind",
        staging: "--betaremind",
        production: "--remind",
      }[process.env.NODE_ENV] ?? "--remind";
  }

  async exec(message: FireMessage) {
    if (this.botQuoteRegex.test(message.content) || message.editedAt) {
      this.botQuoteRegex.lastIndex = 0;
      return this.cleanCommandUtil(message);
    }

    this.botQuoteRegex.lastIndex = 0;

    let inhibited = false;
    const inhibitors = [...this.client.inhibitorHandler.modules.values()].sort(
      // @ts-ignore (idk why it thinks priority doesn't exist)
      (a, b) => b.priority - a.priority
    );

    if (message.content.includes(this.remindFlag)) {
      const remindCommand = this.client.getCommand(
        "reminders-create"
      ) as RemindersCreate;
      for (const inhibitor of inhibitors) {
        if (inhibited || inhibitor.id == "slashonly") continue;
        let exec = inhibitor.exec(message, remindCommand);
        if (this.client.util.isPromise(exec)) exec = await exec;
        if (exec) inhibited = true;
      }
      if (!inhibited) {
        let content = message.content.replace(this.remindFlag, "");
        let repeat: number, step: string;

        // parse repeat flag
        const repeatExec = remindCommand.repeatRegex.exec(content);
        if (repeatExec?.length == 2) repeat = parseInt(repeatExec[1]);
        else repeat = 0;
        remindCommand.repeatRegex.lastIndex = 0;
        content = content.replace(remindCommand.repeatRegex, "");

        // parse step flag
        const stepExec = remindCommand.stepRegex.exec(content);
        remindCommand.stepRegex.lastIndex = 0;
        step = stepExec?.[1] ?? "";
        content = content.replace(remindCommand.stepRegex, "").trimEnd();

        // parse reminder text
        const parsedTime = parseTime(
          content.trim(),
          message.createdAt,
          message.author.timezone,
          message
        );

        // replace reminder text with reference content if applicable
        if (parsedTime && message.reference) {
          const ref = await message.fetchReference().catch(() => {});
          if (ref && ref.content) parsedTime.text = ref.content;
          else if (ref && ref.attachments.size)
            parsedTime.text = ref.attachments.map((a) => a.url).join("\n");
        }

        if (!parsedTime?.text) return;

        // and now comes running the command,
        // events included for analytics and debugging
        const args = {
          reminder: parsedTime,
          repeat,
          step,
        };
        message.util.parsed.content = `${
          parsedTime.text
        } ${parsedTime.date.toLocaleString()}${
          repeat ? ` --repeat ${repeat}` : ""
        }${step ? ` --step ${step}` : ""}`;
        this.client.commandHandler.emit(
          CommandHandlerEvents.COMMAND_STARTED,
          message,
          remindCommand,
          args
        );
        await remindCommand
          .run(message, args)
          .then((ret) => {
            this.client.commandHandler.emit(
              CommandHandlerEvents.COMMAND_FINISHED,
              message,
              remindCommand,
              args,
              ret
            );
          })
          .catch((err) => {
            this.client.commandHandler.emit(
              "commandError",
              message,
              remindCommand,
              args,
              err
            );
          });
      }
    }

    const quoteCommand = this.client.getCommand("quote") as Quote;

    if (
      quoteCommand?.isDisabled(message.guild) &&
      !message.author?.isSuperuser()
    ) {
      this.cleanCommandUtil(message);
      return;
    }

    let matches: MessageLinkMatch[] = [];
    let messageLink: RegExpExecArray;
    while ((messageLink = regexes.discord.quoteMessage.exec(message.content)))
      if (
        messageLink &&
        !messageLink[0].startsWith("<") &&
        !messageLink[0].endsWith(">")
      )
        matches.push(messageLink.groups as unknown as MessageLinkMatch);

    matches = matches.filter((match) => {
      if (process.env.NODE_ENV == "development") return match.channel == "dev.";
      else if (process.env.NODE_ENV == "staging")
        return match.channel == "beta.";
      return match.channel != "dev." && match.channel != "beta.";
    });

    if (!matches.length) {
      this.cleanCommandUtil(message);
      return;
    } else if (matches.length > 5 && !message.author.premium)
      matches = matches.slice(0, 5);
    else if (matches.length > 10 && !message.author.isSuperuser())
      matches = matches.slice(0, 10);

    const messageIds = matches.map((match) => match.message_id);
    matches = matches.filter(
      (match, pos) => messageIds.indexOf(match.message_id) == pos
    ); // remove dupes

    // reset inhibited
    inhibited = false;

    for (const inhibitor of inhibitors) {
      if (inhibited || inhibitor.id == "slashonly") continue;
      let exec = inhibitor.exec(message, quoteCommand);
      if (this.client.util.isPromise(exec)) exec = await exec;
      if (exec) {
        this.client.commandHandler.emit(
          "commandBlocked",
          message,
          quoteCommand,
          inhibitor.reason
        );
        inhibited = true;
      }
    }

    if (inhibited) {
      this.cleanCommandUtil(message);
      return;
    }

    const shards = this.client.options.shards as number[];

    const crossClusterQuotes = matches.filter((quote) => {
      const shard = this.client.util.getShard(quote.guild_id);
      return !shards.includes(shard);
    });

    if (this.client.manager.ws?.open)
      crossClusterQuotes.forEach((quote) =>
        quoteCommand.forwardCrossClusterQuote(message, quote)
      );

    const localQuotes = matches.filter((quote) => {
      const shard = this.client.util.getShard(quote.guild_id);
      return shards.includes(shard);
    });

    const iterableQuotes = localQuotes.filter(
      (quote) =>
        !!quote.end_message_id &&
        quote.guild_id == quote.end_guild_id &&
        quote.channel_id == quote.end_channel_id
    );
    for (const quote of iterableQuotes) {
      let limit = 5;
      if (message.author.premium) limit = 10;
      if (message.author.isSuperuser()) limit = 50;

      const source = this.client.channels.cache.get(quote.channel_id);
      if (!source || !("messages" in source)) continue;

      const iterator = new MessageIterator(source, {
        limit,
        after: quote.message_id,
        before: (BigInt(quote.end_message_id) + 1n).toString(),
      });
      const messages = await iterator.flatten().catch(() => []);
      if (messages.length && messages.at(-1)?.id == quote.end_message_id)
        quote.iteratedMessages = messages;
    }

    for (const quote of localQuotes)
      await quoteCommand.handleLocalQuote(
        message,
        quote,
        quote.channel == "debug."
      );
  }

  cleanCommandUtil(message: FireMessage | ApplicationCommandMessage) {
    if (message instanceof ApplicationCommandMessage) return;
    const util = message.util;
    if (!util.parsed?.command)
      this.client.commandHandler.commandUtils.delete(message.id);

    if (this.shouldSendHello(message))
      message
        .send("HELLO_PREFIX", {
          prefix: "/", // slash commands my beloved
        })
        .catch(() => {});
  }

  private shouldSendHello(message: FireMessage) {
    if (!mentionRegex)
      mentionRegex = new RegExp(`^<@!?${this.client.user.id}>$`);
    return mentionRegex.test(message.content.trim());
  }
}
