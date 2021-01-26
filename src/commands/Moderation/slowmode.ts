import {
  MessageReaction,
  TextChannel,
  CategoryChannel,
  GuildChannel,
} from "discord.js";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class Slowmode extends Command {
  constructor() {
    super("slowmode", {
      description: (language: Language) =>
        language.get("SLOWMODE_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "MANAGE_CHANNELS"],
      userPermissions: ["MANAGE_CHANNELS"],
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
      channel?: TextChannel | CategoryChannel;
      global?: boolean;
    }
  ) {
    if (args.delay < 0 || args.delay > 21600) return await message.error();
    if (
      !args.channel &&
      message.util?.parsed?.alias != "slowmodeall" &&
      !args.global
    )
      args.channel = message.channel as TextChannel;
    else if (
      !args.channel &&
      (message.util?.parsed?.alias == "slowmodeall" || args.global)
    )
      return await this.globalSlowmode(message, args.delay);
    if (!["text", "category", undefined].includes(args.channel?.type))
      return await message.error("SLOWMODE_INVALID_TYPE");
    let failed = [];
    if (args.channel?.type == "category") {
      args.channel.children.forEach(async (channel) => {
        if (channel.type == "text")
          await (channel as TextChannel)
            .setRateLimitPerUser(
              args.delay,
              `Slowmode set by ${message.author}`
            )
            .catch(() => {
              failed.push(channel.toString());
            });
      });
      return failed.length
        ? await message.error("SLOWMODE_FAILED", failed)
        : await message.success();
    } else if (args.channel.type == "text") {
      const limited = await args.channel
        .setRateLimitPerUser(args.delay, `Slowmode set by ${message.author}`)
        .catch(async () => {
          return await message.error();
        });
      if (limited instanceof MessageReaction) return;
      return await message.success();
    } else return await message.error();
  }

  async globalSlowmode(message: FireMessage, delay: number) {
    let failed: string[] = [];
    const channels = message.guild.channels.cache
      .filter((channel: GuildChannel) => channel.type == "text")
      .array() as TextChannel[];
    let warning: FireMessage;
    if (channels.length > 50)
      warning = (await message.send(
        "SLOWMODE_SETTING_GLOBAL",
        channels.length
      )) as FireMessage;
    for (const channel of channels) {
      if (
        channel.rateLimitPerUser != delay &&
        message.guild.me.permissionsIn(channel).has("MANAGE_CHANNELS")
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
      ? await message.error("SLOWMODE_GLOBAL_FAIL_SOME", failed)
      : await message.success();
  }
}
