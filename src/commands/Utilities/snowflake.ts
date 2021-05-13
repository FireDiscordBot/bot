import {
  DeconstructedSnowflake,
  SnowflakeUtil,
  GuildChannel,
  MessageEmbed,
  Permissions,
  DMChannel,
} from "discord.js";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { humanize } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import * as moment from "moment";

export default class Snowflake extends Command {
  constructor() {
    super("snowflake", {
      description: (language: Language) =>
        language.get("SNOWFLAKE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "snowflake",
          type: "user|member|snowflake",
          description: (language: Language) =>
            language.get("SNOWFLAKE_ARGUMENT_DESCRIPTION"),
          required: true,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
    });
  }

  async exec(
    message: FireMessage,
    args: { snowflake: { snowflake: string } & DeconstructedSnowflake }
  ) {
    if (!args.snowflake) return;
    let { snowflake } = args;
    let user: FireUser;
    if (snowflake instanceof FireUser) {
      user =
        // check cache for non reference user
        (this.client.users.cache.get(snowflake.id) as FireUser) ?? snowflake;
      snowflake = {
        snowflake: snowflake.id,
        ...SnowflakeUtil.deconstruct(snowflake.id),
      };
    } else if (snowflake instanceof FireMember) {
      user =
        // check cache for non reference member
        (message.guild.members.cache.get(snowflake.id) as FireMember).user ??
        snowflake.user;
      snowflake = {
        snowflake: snowflake.id,
        ...SnowflakeUtil.deconstruct(snowflake.id),
      };
    }

    const created = snowflake.date.toLocaleString(message.language.id);
    const now = moment();
    const createdDelta =
      humanize(
        moment(snowflake.date).diff(now),
        message.language.id.split("-")[0]
      ) +
      (now.isBefore(snowflake.date)
        ? message.language.get("FROM_NOW")
        : message.language.get("AGO"));

    let info = [
      `**${message.language.get("CREATED")}:** ${created} (${createdDelta})`,
      `**${message.language.get("TIMESTAMP")}:** ${snowflake.timestamp}`,
      `**${message.language.get("WORKER_ID")}:** ${snowflake.workerID}`,
      `**${message.language.get("PROCESS_ID")}:** ${snowflake.processID}`,
      `**${message.language.get("INCREMENT")}:** ${snowflake.increment}`,
    ];

    if (user && !message.guild.members.cache.has(snowflake.snowflake))
      info.push(
        message.language.get(
          "USER_SNOWFLAKE_BELONGS_TO",
          message.language.get("USER"),
          user.toString()
        ) as string
      );
    else if (user)
      info.push(
        message.language.get(
          "USER_SNOWFLAKE_BELONGS_TO",
          message.language.get("MEMBER"),
          user.toString()
        ) as string
      );

    if (this.client.guilds.cache.has(snowflake.snowflake)) {
      const guild = this.client.guilds.cache.get(snowflake.snowflake);
      info.push(
        guild.members.cache.has(message.author.id)
          ? (message.language.get(
              "USER_SNOWFLAKE_BELONGS_TO",
              message.language.get("GUILD"),
              guild.name
            ) as string)
          : (message.language.get(
              "USER_SNOWFLAKE_BELONGS_TO",
              message.language.get("GUILD")
            ) as string)
      );
    }

    if (message.guild && message.guild.roles.cache.has(snowflake.snowflake))
      info.push(
        message.language.get(
          "USER_SNOWFLAKE_BELONGS_TO",
          message.language.get("ROLE"),
          message.guild.roles.cache.get(snowflake.snowflake).toString()
        ) as string
      );

    if (this.client.emojis.cache.has(snowflake.snowflake))
      info.push(
        message.language.get(
          "USER_SNOWFLAKE_BELONGS_TO",
          message.language.get("EMOJI"),
          this.client.emojis.cache.get(snowflake.snowflake).toString()
        ) as string
      );

    if (this.client.channels.cache.has(snowflake.snowflake)) {
      const channel = this.client.channels.cache.get(snowflake.snowflake);
      if (channel.type == "dm") {
        if ((channel as DMChannel).recipient.id == message.author.id)
          info.push(
            message.language.get(
              "USER_SNOWFLAKE_BELONGS_TO",
              message.language.get("CHANNEL"),
              message.language.get("DM_CHANNEL")
            ) as string
          );
      } else {
        const member = (channel as GuildChannel).guild.members.cache.get(
          message.author.id
        );
        info.push(
          member?.permissionsIn(channel).has(Permissions.FLAGS.VIEW_CHANNEL)
            ? (message.language.get(
                "USER_SNOWFLAKE_BELONGS_TO",
                message.language.get("CHANNEL"),
                channel.toString()
              ) as string)
            : (message.language.get(
                "USER_SNOWFLAKE_BELONGS_TO",
                message.language.get("CHANNEL")
              ) as string)
        );
      }
    }

    if (
      this.client.channels.cache
        .filter((c) => c.type == "text")
        .map((c: FireTextChannel) => c.messages.cache)
        .find((m) => m.has(snowflake.snowflake))
    ) {
      let viewable = false;
      const snowflakeMessage = this.client.channels.cache
        .filter((c) => c.type == "text")
        .map((c: FireTextChannel) => c.messages.cache)
        .find((m) => m.has(snowflake.snowflake))
        .get(snowflake.snowflake) as FireMessage;
      const channel = snowflakeMessage.channel;
      if (
        channel.type == "dm" &&
        (channel as DMChannel).recipient.id == message.author.id
      )
        viewable = true;
      else {
        const member = (channel as GuildChannel).guild.members.cache.get(
          message.author.id
        );
        if (member?.permissionsIn(channel).has(Permissions.FLAGS.VIEW_CHANNEL))
          viewable = true;
      }
      info.push(
        viewable
          ? (message.language.get(
              "USER_SNOWFLAKE_BELONGS_TO",
              message.language.get("MESSAGE"),
              `[${message.language.get("CLICK_TO_VIEW")}](${
                snowflakeMessage.url
              })`
            ) as string)
          : (message.language.get(
              "USER_SNOWFLAKE_BELONGS_TO",
              message.language.get("MESSAGE")
            ) as string)
      );
    }

    if (
      this.client.channels.cache
        .filter((c) => c.type == "text")
        .map((c: FireTextChannel) => c.messages.cache)
        .find((c) => c.find((m) => m.attachments.has(snowflake.snowflake)))
    ) {
      let viewable = false;
      const snowflakeMessage = this.client.channels.cache
        .filter((c) => c.type == "text")
        .map((c: FireTextChannel) => c.messages.cache)
        .find((c) => c.find((m) => m.attachments.has(snowflake.snowflake)))
        .first() as FireMessage;
      const channel = snowflakeMessage.channel;
      if (
        channel.type == "dm" &&
        (channel as DMChannel).recipient.id == message.author.id
      )
        viewable = true;
      else {
        const member = (channel as GuildChannel).guild.members.cache.get(
          message.author.id
        );
        if (member?.permissionsIn(channel).has(Permissions.FLAGS.VIEW_CHANNEL))
          viewable = true;
      }
      info.push(
        viewable && snowflakeMessage.attachments.get(snowflake.snowflake)?.url
          ? (message.language.get(
              "USER_SNOWFLAKE_BELONGS_TO",
              message.language.get("ATTACHMENT"),
              `[${message.language.get("CLICK_TO_VIEW")}](${
                snowflakeMessage.attachments.get(snowflake.snowflake).url
              })`
            ) as string)
          : (message.language.get(
              "USER_SNOWFLAKE_BELONGS_TO",
              message.language.get("ATTACHMENT")
            ) as string)
      );
    }

    const embed = new MessageEmbed()
      .setColor(message.member?.displayHexColor || "#ffffff")
      .setTimestamp(snowflake.date)
      .setAuthor(
        message.author.toString(),
        message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .setDescription(message.language.get("USER_SNOWFLAKE_DESCRIPTION"))
      .addField(`» ${message.language.get("ABOUT")}`, info.join("\n"));

    if (user)
      embed.description = embed.description.split("\n").slice(2).join("\n");

    return await message.channel.send(embed);
  }
}
