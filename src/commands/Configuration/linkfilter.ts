import { Option } from "@fire/lib/interfaces/interactions";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
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
          type: "string",
          readableType: "filters",
          autocomplete: true,
          required: false,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
    });
  }

  async autocomplete(guild: FireGuild, option: Option) {
    // allows it to be immediately updated rather than waiting for the command to propogate
    return valid;
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
      return await message.error("LINKFILTER_FILTER_LIST", {
        valid: valid.join(", "),
      });
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
        { enabled: current.join(", ") }
      );
    }
  }
}
