import { FireMessage } from "../../../lib/extensions/message";
import { TextChannel, CategoryChannel } from "discord.js";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Argument } from "discord-akairo";

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
          readableType: "textChannel|category",
          default: null,
          required: true,
          unordered: true,
        },
      ],
    });
  }

  async exec(
    message: FireMessage,
    args: { delay: number; channel?: TextChannel | CategoryChannel }
  ) {
    if (!args.channel) args.channel = message.channel as TextChannel;
    if (!["text", "category", undefined].includes(args.channel?.type))
      return await message.error("SLOWMODE_INVALID_TYPE");
    let failed = [];
    if (args.channel.type == "category") {
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
      args.channel
        .setRateLimitPerUser(args.delay, `Slowmode set by ${message.author}`)
        .catch(async () => {
          return await message.error();
        });
      return await message.success();
    } else return await message.error();
  }
}
