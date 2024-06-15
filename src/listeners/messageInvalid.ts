import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import {
  MessageLinkMatch,
  PartialQuoteDestination,
} from "@fire/lib/interfaces/messages";
import { GuildTextChannel, constants } from "@fire/lib/util/constants";
import { messageConverter } from "@fire/lib/util/converters";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import RemindersCreate from "@fire/src/commands/Utilities/createremind";
import Quote from "@fire/src/commands/Utilities/quote";
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
    if (
      // (this.client.config.dev && process.env.USE_LITECORD != "true") ||
      this.botQuoteRegex.test(message.content) ||
      !message.guild ||
      message.editedAt
    ) {
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
          message.author.settings.get<string>(
            "reminders.timezone.iana",
            "Etc/UTC"
          ),
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

        // finally, we run the command as if it was invoked normally
        await remindCommand
          .run(message, {
            reminder: parsedTime,
            repeat,
            step,
          })
          .catch(() => {});
      }
    }

    const quoteCommand = this.client.getCommand("quote") as Quote;

    if (
      (quoteCommand.isDisabled(message.guild) &&
        !message.author?.isSuperuser()) ||
      process.env.NODE_ENV != "production"
    ) {
      this.cleanCommandUtil(message);
      return;
    }

    let matches: MessageLinkMatch[] = [];
    let messageLink: RegExpExecArray;
    while (
      (messageLink = regexes.discord.messageGlobal.exec(message.content))
    ) {
      if (
        messageLink &&
        !messageLink[0].startsWith("<") &&
        !messageLink[0].endsWith(">")
      )
        matches.push(messageLink.groups as unknown as MessageLinkMatch);
    }

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
      if (inhibited) continue;
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

    for (const quote of matches) {
      const shard = this.client.util.getShard(quote.guild_id);
      if (!shards.includes(shard)) {
        if (!this.client.manager.ws?.open) continue;
        const webhookURL = await this.client.util.getQuoteWebhookURL(
          message.channel as GuildTextChannel
        );
        if (!webhookURL || typeof webhookURL != "string") continue;
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.CROSS_CLUSTER_QUOTE, {
              shard,
              quoter: message.author.id,
              webhook: webhookURL,
              message: quote,
              destination: {
                nsfw: (message.channel as GuildTextChannel)?.nsfw || false,
                permissions: message.guild
                  ? message.member?.permissions.bitfield.toString() || "0"
                  : "0",
                guild_id: message.guild?.id,
                id: message.channelId,
              } as PartialQuoteDestination,
            })
          )
        );
      } else {
        const convertedMessage = await messageConverter(
          message,
          null,
          quote.channel != "debug.", // will return converter error msgs if using debug.discord.com
          quote
        ).catch(() => {});
        // TODO: maybe return the caught error and add an else here?
        if (convertedMessage) {
          const args = {
            quote: convertedMessage as FireMessage,
            debug: quote.channel == "debug.",
          };
          this.client.commandHandler.emit(
            CommandHandlerEvents.COMMAND_STARTED,
            message,
            quoteCommand,
            args
          );
          await quoteCommand
            .exec(message, args)
            .then((ret) => {
              this.client.commandHandler.emit(
                CommandHandlerEvents.COMMAND_FINISHED,
                message,
                quoteCommand,
                args,
                ret
              );
            })
            .catch((err) => {
              this.client.commandHandler.emit(
                "commandError",
                message,
                quoteCommand,
                args,
                err
              );
            });
          await this.client.util.sleep(500);
        }
      }
    }
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
