import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { CommonContext } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { MessageActionRow, MessageSelectMenu } from "discord.js";

export type LinkFilters =
  | "discord"
  | "paypal"
  | "youtube"
  | "twitch"
  | "twitter"
  | "shorteners";

export default class LinkfilterToggle extends Command {
  valid = {
    names: ["discord", "paypal", "youtube", "twitch", "twitter", "shorteners"],
    options: (context: CommonContext) => {
      if (!context.guild) return [];
      const enabled = context.guild.settings.get<LinkFilters[]>(
        "mod.linkfilter",
        []
      );
      return [
        {
          label: "Discord",
          value: "discord",
          emoji: "866329296020701218",
          description: context.language.get("LINKFILTER_DISCORD"),
          default: enabled.includes("discord"),
        },
        {
          label: "PayPal",
          value: "paypal",
          emoji: "944118377520197702",
          description: context.language.get("LINKFILTER_PAYPAL"),
          default: enabled.includes("paypal"),
        },
        {
          label: "YouTube",
          value: "youtube",
          emoji: "861863653962416128",
          description: context.language.get("LINKFILTER_YOUTUBE"),
          default: enabled.includes("youtube"),
        },
        {
          label: "Twitch",
          value: "twitch",
          emoji: "908592812046573588",
          description: context.language.get("LINKFILTER_TWITCH"),
          default: enabled.includes("twitch"),
        },
        {
          label: "Twitter",
          value: "twitter",
          emoji: "861863654097682452",
          description: context.language.get("LINKFILTER_TWITTER"),
          default: enabled.includes("twitter"),
        },
        {
          label: "Link Shorteners",
          value: "shorteners",
          emoji: "859388126875484180",
          description: context.language.get("LINKFILTER_SHORTENERS"),
          default: enabled.includes("shorteners"),
        },
        {
          label: "Disable All Filters",
          value: "disable",
          emoji: "859388130636988436",
          description: context.language.get("LINKFILTER_DISABLE"),
        },
      ];
    },
  };
  constructor() {
    super("linkfilter-toggle", {
      description: (language: Language) =>
        language.get("LINKFILTER_TOGGLE_COMMAND_DESCRIPTION"),
      clientPermissions: [PermissionFlagsBits.ManageMessages],
      userPermissions: [PermissionFlagsBits.ManageGuild],
      enableSlashCommand: true,
      parent: "linkfilter",
      restrictTo: "guild",
      slashOnly: true,
      args: [],
    });
  }

  async run(command: ApplicationCommandMessage) {
    return await command.send("LINKFILTER_TOGGLE_FILTER_LIST", {
      components: this.getMenuComponents(command),
    });
  }

  getMenuComponents(context: CommonContext) {
    if (!context.guild) return [];
    const options = this.valid.options(context);
    return [
      new MessageActionRow().addComponents(
        new MessageSelectMenu()
          .setPlaceholder(context.language.get("LINKFILTER_TOGGLE_PLACEHOLDER"))
          .setCustomId(`!linkfilters`)
          .addOptions(options)
          .setMinValues(1)
          .setMaxValues(options.length)
      ),
    ];
  }
}
