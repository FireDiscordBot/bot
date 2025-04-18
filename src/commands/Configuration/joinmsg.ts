import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Argument } from "discord-akairo";
import { Snowflake } from "discord-api-types/globals";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { MessageEmbed, MessageMentionOptions } from "discord.js";

const disableArgs = ["off", "disable", "false"];

const {
  regexes: { joinleavemsgs },
} = constants;

export default class JoinMSG extends Command {
  constructor() {
    super("joinmsg", {
      description: (language: Language) =>
        language.get("JOINMSG_COMMAND_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageGuild],
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
      aliases: ["joinmessage"],
      restrictTo: "guild",
      ephemeral: true,
    });
  }

  async exec(
    message: FireMessage,
    args: {
      channel?: FireTextChannel | "off" | "disable" | "false";
      message?: string;
    }
  ) {
    if (
      args.channel &&
      !(args.channel instanceof FireTextChannel) &&
      !disableArgs.includes(args.channel)
    )
      return await message.error("JOINMSG_ARGUMENT_INVALID");
    let msg = message.guild.settings.get<string>("greet.joinmsg");
    if (args.channel instanceof FireTextChannel && !args.message && !msg)
      return await message.error("JOINMSG_MESSAGE_REQUIRED");
    const variableMap = {
      "{user}": message.author.toString(),
      "{user.mention}": message.author.toMention(),
      "{user.name}": message.author.username,
      "{user.displayname}": message.author.globalName,
      "{user.discrim}": message.author.discriminator,
      "{guild}": message.guild.name,
      "{server}": message.guild.name,
      "{count}": message.guild.memberCount.toLocaleString(
        message.guild.language.id
      ),
      "{count.suffix}": this.client.util.numberWithSuffix(
        message.guild.memberCount
      ),
    };
    if (!args.channel) {
      if (!msg) {
        const embed = new MessageEmbed()
          .setColor(message.member.displayColor || "#FFFFFF")
          .setTimestamp()
          .setDescription(message.language.getError("JOINMSG_SETUP_REQUIRED"))
          .addFields({
            name: message.language.get("VARIABLES"),
            value: Object.entries(variableMap)
              .map(([key, val]) => `${key}: ${val}`)
              .join("\n"),
          });
        return await message.channel.send({ embeds: [embed] });
      }
      const channel = message.guild.channels.cache.get(
        message.guild.settings.get<Snowflake>("greet.joinchannel")
      );
      const embed = new MessageEmbed()
        .setColor(message.member?.displayColor || "#FFFFFF")
        .setTimestamp()
        .setDescription(
          message.language.get("JOINMSG_CURRENT_SETTINGS", {
            prefix: message.util?.parsed?.prefix,
          })
        );
      if (channel)
        embed.addFields([
          {
            name: message.language.get("CHANNEL"),
            value: channel?.toString(),
          },
          { name: message.language.get("MESSAGE"), value: msg },
        ]);
      embed.addFields({
        name: message.language.get("VARIABLES"),
        value: Object.entries(variableMap)
          .map(([key, val]) => `${key}: ${val}`)
          .join("\n"),
      });
      return await message.channel.send({ embeds: [embed] });
    } else if (
      typeof args.channel == "string" &&
      disableArgs.includes(args.channel)
    ) {
      if (!msg) return await message.error("JOINMSG_DISABLE_ALREADY");
      const msgDelete = await message.guild.settings.delete(
        "greet.joinmsg",
        message.author
      );
      const channelDelete = await message.guild.settings.delete(
        "greet.joinchannel",
        message.author
      );
      return !!msgDelete && !!channelDelete
        ? await message.success("JOINMSG_DISABLED")
        : await message.error("ERROR_CONTACT_SUPPORT");
    }
    const channel = args.channel as FireTextChannel;
    const allowedMentions: MessageMentionOptions = {
      users: [message.author.id],
    };
    if (args.message) {
      await message.guild.settings.set<string>(
        "greet.joinmsg",
        args.message,
        message.author
      );
      msg = args.message;
    }
    await message.guild.settings.set<string>(
      "greet.joinchannel",
      channel.id,
      message.author
    );
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
      [
        joinleavemsgs.countSuffix,
        this.client.util.numberWithSuffix(message.guild.memberCount),
      ],
    ];
    for (const [regex, replacement] of regexes)
      msg = msg.replace(regex as RegExp, replacement as string);
    return await message.channel.send({
      content: `${this.client.util.useEmoji("success")} ${message.language.get(
        "JOINMSG_SET_SUCCESS",
        { channel: channel.toString() }
      )} ${msg}`,
      allowedMentions,
    });
  }
}
