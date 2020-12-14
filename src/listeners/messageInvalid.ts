import { messageConverter } from "../../lib/util/converters";
import { FireMessage } from "../../lib/extensions/message";
import { constants } from "../../lib/util/constants";
import { Listener } from "../../lib/util/listener";
import Remind from "../commands/Utilities/remind";
import Quote from "../commands/Utilities/quote";

const { regexes } = constants;

export default class MessageInvalid extends Listener {
  botQuoteRegex: RegExp;
  slashCommandRegex: RegExp;

  constructor() {
    super("messageInvalid", {
      emitter: "commandHandler",
      event: "messageInvalid",
    });
    this.botQuoteRegex = /.{1,25}\s?quote (?:https?:\/\/)?(?:(?:ptb|canary|development)\.)?discord(?:app)?\.com\/channels\/(?:\d{15,21}\/?){3}/gim;
    this.slashCommandRegex = /<\/\w+:\d{15,21}>/gim;
  }

  async exec(message: FireMessage) {
    if (
      this.botQuoteRegex.test(message.content) ||
      this.slashCommandRegex.test(message.content) ||
      !message.guild ||
      message.editedAt
    ) {
      this.botQuoteRegex.lastIndex = 0;
      this.slashCommandRegex.lastIndex = 0;
      return;
    }

    let inhibited = false;
    const inhibitors = [...this.client.inhibitorHandler.modules.values()].sort(
      // @ts-ignore (idk why it thinks priority doesn't exist)
      (a, b) => b.priority - a.priority
    );

    if (message.content.includes("--remind")) {
      const remindCommand = this.client.getCommand("remind") as Remind;
      for (const inhibitor of inhibitors) {
        if (inhibited) continue;
        let exec = inhibitor.exec(message, remindCommand);
        if (this.client.util.isPromise(exec)) exec = await exec;
        if (exec) inhibited = true;
      }
      await remindCommand
        .exec(message, {
          reminder: message.content.replace("--remind", " "),
        })
        .catch(() => {});
    }

    if (!message.guild.settings.get("utils.autoquote", false)) return;

    let matches = [];
    let messageLink: RegExpExecArray;
    while (
      (messageLink = regexes.discord.messageGlobal.exec(message.content))
    ) {
      if (messageLink) matches.push(messageLink.groups);
    }

    const messageIds = matches.map((match) => match.message_id);
    matches = matches.filter(
      (match, pos) => messageIds.indexOf(match.message_id) == pos
    ); // remove dupes

    const quoteCommand = this.client.getCommand("quote") as Quote;

    for (const inhibitor of inhibitors) {
      if (inhibited) continue;
      let exec = inhibitor.exec(message, quoteCommand);
      if (this.client.util.isPromise(exec)) exec = await exec;
      if (exec) inhibited = true;
    }

    if (!inhibited) {
      for (const quote of matches) {
        const convertedMessage = await messageConverter(
          message,
          null,
          true,
          quote
        ).catch(() => {});
        if (convertedMessage) {
          await quoteCommand
            .exec(message, { quote: convertedMessage })
            .catch(() => {});
          await this.client.util.sleep(500);
        }
      }
    }
  }
}
