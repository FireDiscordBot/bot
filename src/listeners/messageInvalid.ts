import { messageConverter } from "../../lib/util/converters";
import { FireMessage } from "../../lib/extensions/message";
import { constants } from "../../lib/util/constants";
import { Listener } from "../../lib/util/listener";
import Quote from "../commands/Utilities/quote";
import { match } from "assert";

const { regexes } = constants;

export default class MessageInvalid extends Listener {
  botQuoteRegex: RegExp;

  constructor() {
    super("messageInvalid", {
      emitter: "commandHandler",
      event: "messageInvalid",
    });
    this.botQuoteRegex = /.{1,25}\s?quote (?:https?:\/\/)?(?:(?:ptb|canary|development)\.)?discord(?:app)?\.com\/channels\/(?:\d{15,21}\/?){3}/gim;
  }

  async exec(message: FireMessage) {
    if (this.botQuoteRegex.test(message.content)) return;
    if (!message.guild.settings.get("utils.autoquote", false)) return;

    let matches = [];
    let messageLink: RegExpExecArray;
    while ((messageLink = regexes.discord.message.exec(message.content))) {
      matches.push(messageLink.groups);
    }

    const messageIds = matches.map((match) => match.message_id);
    matches = matches.filter(
      (match, pos) => messageIds.indexOf(match.message_id) == pos
    ); // remove dupes

    const quoteCommand = this.client.getCommand("quote") as Quote;
    const inhibited = await this.client.inhibitorHandler.test(
      "all",
      message,
      quoteCommand
    );
    if (!inhibited) {
      for (const quote of matches) {
        const convertedMessage = await messageConverter(
          message,
          null,
          true,
          quote
        );
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
