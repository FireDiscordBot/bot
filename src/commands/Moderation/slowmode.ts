import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { CategoryChannel } from "discord.js";

// TODO: make this more slash command friendly

// this command isn't used enough to justify revamping
// for the initial merge of the feature/better-slash-commands branch

export default class Slowmode extends Command {
  constructor() {
    super("slowmode", {
      description: (language: Language) =>
        language.get("SLOWMODE_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.SendMessages,
      ],
      userPermissions: [PermissionFlagsBits.ManageChannels],
      args: [
        {
          id: "delay",
          type: "number",
          default: 0,
          required: false,
          unordered: true,
        },
        {
          id: "channel",
          type: "guildChannelSilent",
          readableType: "text-channel|category",
          slashCommandType: "channel",
          default: null,
          required: false,
          unordered: true,
        },
        {
          id: "global",
          flag: "--global",
          match: "flag",
          required: false,
        },
      ],
      enableSlashCommand: true,
      aliases: ["slowmodeall"],
      moderatorOnly: true,
    });
  }

  async exec(
    message: FireMessage,
    args: {
      delay: number;
      channel?: FireTextChannel | CategoryChannel;
      global?: boolean;
    }
  ) {
    if (args.delay < 0 || args.delay > 21600)
      return await message.error("SLOWMODE_DELAY_INVALID");
    if (
      !args.channel &&
      message.util?.parsed?.alias != "slowmodeall" &&
      !args.global
    )
      args.channel = message.channel as FireTextChannel;
    else if (
      !args.channel &&
      (message.util?.parsed?.alias == "slowmodeall" || args.global)
    )
      return await this.globalSlowmode(message, args.delay);
    if (!["GUILD_TEXT", "category", undefined].includes(args.channel?.type))
      return await message.error("SLOWMODE_INVALID_TYPE");
    let failed = [];
    if (args.channel?.type == "GUILD_CATEGORY") {
      args.channel.children.forEach(async (channel) => {
        if (channel.type == "GUILD_TEXT")
          await (channel as FireTextChannel)
            .setRateLimitPerUser(
              args.delay,
              `Slowmode set by ${message.author}`
            )
            .catch(() => {
              failed.push(channel.toString());
            });
      });
      return failed.length
        ? await message.error("SLOWMODE_FAILED", { failed: failed.join(", ") })
        : await message.success("SLOWMODE_SUCCESS");
    } else if (args.channel.type == "GUILD_TEXT") {
      const limited = await args.channel
        .setRateLimitPerUser(args.delay, `Slowmode set by ${message.author}`)
        .catch(() => null);
      if (limited == null) return await message.error("ERROR_CONTACT_SUPPORT");
      return await message.success("SLOWMODE_SUCCESS");
    } else return await message.error("ERROR_CONTACT_SUPPORT");
  }

  async globalSlowmode(message: FireMessage, delay: number) {
    let failed: string[] = [];
    const channels = message.guild.channels.cache
      .filter((channel) => channel.type == "GUILD_TEXT")
      .toJSON() as FireTextChannel[];
    let warning: FireMessage;
    if (channels.length > 50)
      warning = (await message.send("SLOWMODE_SETTING_GLOBAL", {
        channels: channels.length,
      })) as FireMessage;
    for (const channel of channels) {
      if (
        channel.rateLimitPerUser != delay &&
        message.guild.members.me
          .permissionsIn(channel)
          .has(PermissionFlagsBits.ManageChannels)
      )
        await channel
          .setRateLimitPerUser(
            delay,
            `Slowmode set by ${message.author} in all channels`
          )
          .catch(() => {
            failed.push(channel.toString());
          });
    }
    if (warning) await warning.delete().catch(() => {});
    return failed.length
      ? await message.error("SLOWMODE_GLOBAL_FAIL_SOME", {
          failed: failed.join(", "),
        })
      : await message.success("SLOWMODE_SET");
  }
}
