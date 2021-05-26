import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

const valid = [
  "discord",
  "paypal",
  "youtube",
  "twitch",
  "twitter",
  "shorteners",
];

export default class LinkFilter extends Command {
  constructor() {
    super("linkfilter", {
      description: (language: Language) =>
        language.get("LINKFILTER_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.MANAGE_MESSAGES,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      args: [
        {
          id: "filters",
          type: valid,
          readableType: "filters",
          required: false,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  async exec(
    message: FireMessage,
    args: {
      filters:
        | "discord"
        | "paypal"
        | "youtube"
        | "twitch"
        | "twitter"
        | "shorteners";
    }
  ) {
    if (!args.filters || !valid.includes(args.filters))
      return await message.error("LINKFILTER_FILTER_LIST", valid);
    else {
      let current = message.guild.settings.get<string[]>("mod.linkfilter", []);
      const filter = args.filters;
      if (current.includes(filter))
        current = current.filter((f) => f != filter && valid.includes(f));
      else current.push(filter);
      if (current.length)
        message.guild.settings.set<string[]>("mod.linkfilter", current);
      else message.guild.settings.delete("mod.linkfilter");
      return await message.success(
        current.length ? "LINKFILTER_SET" : "LINKFILTER_RESET",
        current
      );
    }
  }
}
