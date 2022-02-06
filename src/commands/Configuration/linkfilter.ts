import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
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

  async autocomplete() {
    // allows it to be immediately updated rather than waiting for the command to propogate
    return valid;
  }

  async run(
    command: ApplicationCommandMessage,
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
      return await command.error("LINKFILTER_FILTER_LIST", {
        valid: valid.join(", "),
      });
    else {
      let current = command.guild.settings.get<string[]>("mod.linkfilter", []);
      const filter = args.filters;
      if (current.includes(filter))
        current = current.filter((f) => f != filter && valid.includes(f));
      else current.push(filter);
      if (current.length)
        command.guild.settings.set<string[]>("mod.linkfilter", current);
      else command.guild.settings.delete("mod.linkfilter");
      return await command.success(
        current.length ? "LINKFILTER_SET" : "LINKFILTER_RESET",
        { enabled: current.join(", ") }
      );
    }
  }
}
