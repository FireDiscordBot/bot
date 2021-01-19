import { MessageMentionOptions, MessageEmbed, TextChannel } from "discord.js";
import { FireMessage } from "../../../lib/extensions/message";
import { constants } from "../../../lib/util/constants";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Argument } from "discord-akairo";

const disableArgs = ["off", "disable", "false"];

const {
  emojis,
  regexes: { joinleavemsgs },
} = constants;

export default class JoinMSG extends Command {
  constructor() {
    super("joinmsg", {
      description: (language: Language) =>
        language.get("JOINMSG_COMMAND_DESCRIPTION"),
      userPermissions: ["MANAGE_GUILD"],
      args: [
        {
          id: "channel",
          type: Argument.union("textChannelSilent", disableArgs),
          readableType: "channel|disable",
          default: undefined,
          required: false,
        },
        {
          id: "message",
          type: "string",
          match: "rest",
          default: null,
          required: false,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      ephemeral: true,
    });
  }

  async exec(
    message: FireMessage,
    args: {
      channel?: TextChannel | "off" | "disable" | "false";
      message?: string;
    }
  ) {
    if (
      args.channel &&
      !(args.channel instanceof TextChannel) &&
      !disableArgs.includes(args.channel)
    )
      return await message.error("JOINMSG_ARGUMENT_INVALID");
    let msg = message.guild.settings.get("greet.joinmsg") as string;
    if (args.channel instanceof TextChannel && !args.message && !msg)
      return await message.error("JOINMSG_MESSAGE_REQUIRED");
    const variableMap = {
      "{user}": message.author.toString(),
      "{user.mention}": message.author.toMention(),
      "{user.name}": message.author.username,
      "{user.discrim}": message.author.discriminator,
      "{guild}": message.guild.name,
      "{server}": message.guild.name,
      "{count}": message.guild.memberCount.toLocaleString(
        message.guild.language.id
      ),
    };
    if (!args.channel) {
      if (!msg) {
        const embed = new MessageEmbed()
          .setColor("#E74C3C")
          .setTimestamp()
          .setDescription(message.language.get("JOINMSG_SETUP_REQUIRED"))
          .addField(
            message.language.get("VARIABLES"),
            Object.entries(variableMap).map(([key, val]) => `${key}: ${val}`)
          );
        return await message.channel.send(embed);
      }
      const channel = message.guild.channels.cache.get(
        message.guild.settings.get("greet.joinchannel")
      );
      const embed = new MessageEmbed()
        .setColor(message.member?.displayHexColor || "#ffffff")
        .setTimestamp()
        .setDescription(
          message.language.get(
            "JOINMSG_CURRENT_SETTINGS",
            message.util?.parsed?.prefix
          )
        )
        .addField(message.language.get("CHANNEL"), channel?.toString())
        .addField(message.language.get("MESSAGE"), msg)
        .addField(
          message.language.get("VARIABLES"),
          Object.entries(variableMap).map(([key, val]) => `${key}: ${val}`)
        );
      return await message.channel.send(embed);
    } else if (
      typeof args.channel == "string" &&
      disableArgs.includes(args.channel)
    ) {
      if (!msg) return await message.error("JOINMSG_DISABLE_ALREADY");
      const msgDelete = message.guild.settings.delete("greet.joinmsg");
      const channelDelete = message.guild.settings.delete("greet.joinchannel");
      return !!msgDelete && !!channelDelete
        ? await message.success()
        : await message.error();
    }
    const channel = args.channel as TextChannel;
    const allowedMentions: MessageMentionOptions = {
      users: [message.author.id],
    };
    if (args.message) {
      message.guild.settings.set("greet.joinmsg", args.message);
      msg = args.message;
    }
    message.guild.settings.set("greet.joinchannel", channel.id);
    const regexes = [
      [joinleavemsgs.user, message.author.toString()],
      [joinleavemsgs.mention, message.author.toMention()],
      [joinleavemsgs.name, message.author.username],
      [joinleavemsgs.discrim, message.author.discriminator],
      [joinleavemsgs.guild, message.guild.name],
      [
        joinleavemsgs.count,
        message.guild.memberCount.toLocaleString(message.guild.language.id),
      ],
    ];
    for (const [regex, replacement] of regexes)
      msg = msg.replace(regex as RegExp, replacement as string);
    return await message.channel.send(
      `${emojis.success} ${message.language.get(
        "JOINMSG_SET_SUCCESS",
        channel.toString()
      )} ${msg}`,
      { allowedMentions }
    );
  }
}
