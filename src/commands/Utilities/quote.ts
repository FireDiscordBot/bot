import { SlashCommandMessage } from "../../../lib/extensions/slashCommandMessage";
import { PartialQuoteDestination } from "../../../lib/interfaces/messages";
import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { TextChannel, WebhookClient } from "discord.js";
import { constants } from "../../../lib/util/constants";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

const { regexes } = constants;

export default class Quote extends Command {
  constructor() {
    super("quote", {
      description: (language: Language) =>
        language.get("QUOTE_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      args: [
        {
          id: "quote",
          type: "message",
          required: true,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  async exec(
    message?: FireMessage,
    args?: {
      destination?: PartialQuoteDestination;
      quoter?: FireMember;
      quote: FireMessage;
      webhook?: string;
    }
  ) {
    if (!args?.quote) return;
    let webhook: WebhookClient;
    if (args.webhook && args.quoter) {
      const match = regexes.discord.webhook.exec(args.webhook);
      regexes.discord.webhook.lastIndex = 0;
      if (!match?.groups.id || !match?.groups.token) return;
      webhook = new WebhookClient(match.groups.id, match.groups.token);
      return await args.quote
        .quote(args.destination, args.quoter, webhook)
        .catch(() => {});
    } else if (!message) return;
    return await args.quote
      .quote(
        message instanceof SlashCommandMessage
          ? (message.realChannel as TextChannel)
          : (message.channel as TextChannel),
        message.member,
        webhook
      )
      .catch(() => {});
  }
}
