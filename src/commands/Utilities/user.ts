import {
  DeconstructedSnowflake,
  PermissionString,
  UserFlagsString,
  DiscordAPIError,
  ThreadChannel,
  SnowflakeUtil,
  GuildChannel,
  MessageEmbed,
  Permissions,
  ClientUser,
  Formatters,
  DMChannel,
  Snowflake,
} from "discord.js";
import {
  APIApplication,
  APIChannel,
  ApplicationFlags,
} from "discord-api-types";
import { constants, humanize, zws } from "@fire/lib/util/constants";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Ban } from "@aero/ksoft";
import * as moment from "moment";
import * as centra from "centra";

const {
  emojis,
  statusEmojis,
  emojis: { badges },
} = constants;

const isValidURL = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
export default class User extends Command {
  constructor() {
    super("user", {
      description: (language: Language) =>
        language.get("USER_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      args: [
        {
          id: "user",
          type: "user|member|snowflake",
          description: (language: Language) =>
            language.get("USER_SNOWFLAKE_ARGUMENT_DESCRIPTION"),
          default: undefined,
          required: false,
        },
      ],
      aliases: ["userinfo", "infouser", "whois", "u"],
      enableSlashCommand: true,
      restrictTo: "all",
      context: ["user"],
      slashOnly: true,
    });
  }

  async exec(
    message: FireMessage,
    args: {
      user?:
        | FireMember
        | FireUser
        | ({ snowflake: string } & DeconstructedSnowflake);
    }
  ) {
    if (typeof args.user == "undefined")
      args.user = message.member || message.author;
    else if (
      args.user?.hasOwnProperty("snowflake") ||
      message.util?.parsed?.alias == "snowflake"
    )
      return await this.snowflakeInfo(
        message,
        args.user?.hasOwnProperty("snowflake")
          ? (args.user as { snowflake: string } & DeconstructedSnowflake)
          : (args.user as any)
      );
    else if (!args.user) return;
    let member: FireMember, user: FireUser;
    if (args.user instanceof FireMember) {
      member = args.user;
      user = member.user;
    } else user = args.user as FireUser;
    if (!user) {
      if (message.member) {
        member = message.member;
        user = member.user;
      } else user = message.author;
    }
    if (user instanceof FireMember) {
      member = user;
      user = user.user;
    }
    if (
      member?.presence?.clientStatus == null &&
      member?.presence?.status == "offline"
    )
      member = (await member.guild.members
        .fetch({
          user: member,
          withPresences: true,
        })
        .catch(() => {})) as FireMember;
    // revert back to message member if fetching w/presence fails
    if (!member && user.id == message.author.id) member = message.member;
    if (user instanceof ClientUser) {
      member = message.guild?.members.cache.get(user.id) as FireMember;
      user = member.user;
    }
    let color = member ? member.displayColor : message.member?.displayColor;
    if (user.bot && this.client.config.bots[user.id])
      color = this.client.config.bots[user.id].color;
    const badges = this.getBadges(
      user,
      message.author,
      message.guild,
      message.content
    );
    const info = this.getInfo(message, member ? member : user);
    let application: Exclude<APIApplication, "rpc_origins" | "owner" | "team">;
    if (user.bot)
      application = await this.getApplication(user.id).catch(() => null);
    const embed = new MessageEmbed()
      .setColor(color)
      .setTimestamp()
      .setAuthor(
        user.toString(),
        (message.hasExperiment(194480739, 2)
          ? member ?? user
          : user
        ).displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
        application && application.bot_public
          ? `https://discord.com/oauth2/authorize?client_id=${
              application.id
            }&scope=bot%20applications.commands${
              application.id == this.client.user.id
                ? "&permissions=1007021303"
                : ""
            }`
          : null
      )
      .addField(`» ${message.language.get("ABOUT")}`, info.join("\n"));
    if (badges.length)
      embed.setDescription(
        application
          ? `${badges.join("  ")}\n\n${application.description}`
          : badges.join("  ")
      );
    else if (application) embed.setDescription(application.description);
    if (member) {
      if (
        message.hasExperiment(194480739, 1) &&
        member?.avatar &&
        member?.avatar != user.avatar
      )
        embed.setThumbnail(
          member.avatarURL({ size: 2048, format: "png", dynamic: true })
        );
      const roles = member.roles.cache
        .filter((role) => role.id != message.guild.id)
        .sorted((roleA, roleB) => roleA.position - roleB.position)
        .map((role) => role.toString());
      if (roles.length)
        embed.addField(
          `» ${message.language.get("ROLES")} [${member.roles.cache.size - 1}]`,
          this.client.util.shorten(roles, 1000, " - "),
          false
        );
      if (!member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
        let perms = [];
        const keyPerms: PermissionString[] = [
          "BAN_MEMBERS",
          "CHANGE_NICKNAME",
          "KICK_MEMBERS",
          "MANAGE_CHANNELS",
          "MANAGE_GUILD",
          "MANAGE_EMOJIS_AND_STICKERS",
          "MANAGE_MESSAGES",
          "MANAGE_NICKNAMES",
          "MANAGE_ROLES",
          "MANAGE_WEBHOOKS",
          "MENTION_EVERYONE",
          "VIEW_AUDIT_LOG",
          "VIEW_GUILD_INSIGHTS",
          "MANAGE_THREADS",
        ];
        for (const permission of keyPerms)
          if (member.permissions.has(permission))
            perms.push(
              this.client.util.cleanPermissionName(permission, message.language)
            );
        if (perms.length)
          embed.addField(
            `» ${message.language.get("KEY_PERMISSIONS")}`,
            perms.join(", "),
            false
          );
      } else
        embed.addField(
          `» ${message.language.get("PERMISSIONS_TEXT")}`,
          this.client.util.cleanPermissionName(
            "ADMINISTRATOR",
            message.language
          ),
          false
        );
    }
    if (!user.bot) {
      const ksoftBan = await this.getKsoftBan(message, user);
      const notes = [ksoftBan].filter((note) => !!note);
      if (notes.length)
        embed.addField(
          `» ${message.language.get("NOTES")}`,
          notes.join("\n"),
          false
        );
    }
    if (application) {
      const appInfo: string[] = [];
      if (application.bot_public)
        appInfo.push(message.language.getSuccess("USER_BOT_PUBLIC"));
      else appInfo.push(message.language.getError("USER_BOT_PRIVATE"));
      if (
        (application.flags & ApplicationFlags.GatewayGuildMembers) ==
          ApplicationFlags.GatewayGuildMembers ||
        (application.flags & ApplicationFlags.GatewayGuildMembersLimited) ==
          ApplicationFlags.GatewayGuildMembersLimited
      )
        appInfo.push(
          `${
            application.flags & ApplicationFlags.GatewayGuildMembers
              ? emojis.success
              : emojis.warning
          } ${message.language.get("USER_BOT_MEMBERS_INTENT")}`
        );
      else appInfo.push(message.language.getError("USER_BOT_MEMBERS_INTENT"));
      if (
        (application.flags & ApplicationFlags.GatewayPresence) ==
          ApplicationFlags.GatewayPresence ||
        (application.flags & ApplicationFlags.GatewayPresenceLimited) ==
          ApplicationFlags.GatewayPresenceLimited
      )
        appInfo.push(
          `${
            application.flags & ApplicationFlags.GatewayPresence
              ? emojis.success
              : emojis.warning
          } ${message.language.get("USER_BOT_PRESENCE_INTENT")}`
        );
      else appInfo.push(message.language.getError("USER_BOT_PRESENCE_INTENT"));
      if (user.bot && this.client.config.bots[user.id]?.best)
        appInfo.push(message.language.getSuccess("USER_BOT_BEST"));
      if (application.privacy_policy_url || application.terms_of_service_url)
        appInfo.push(""); // spacing between public/intents and links

      if (
        application.privacy_policy_url &&
        isValidURL(application.privacy_policy_url)
      )
        appInfo.push(
          `[${message.language.get("USER_BOT_PRIVACY_POLICY")}](${
            application.privacy_policy_url
          })`
        );
      if (
        application.terms_of_service_url &&
        isValidURL(application.terms_of_service_url)
      )
        appInfo.push(
          `[${message.language.get("USER_BOT_TERMS")}](${
            application.terms_of_service_url
          })`
        );

      embed.addField(`» ${message.language.get("BOT")}`, appInfo.join("\n"));
    }
    member?.presence?.clientStatus
      ? embed.setFooter(
          user.id,
          member.presence.activities.find(
            (activity) => activity.type == "STREAMING"
          )
            ? statusEmojis.streaming
            : statusEmojis[member.presence.status]
        )
      : embed.setFooter(user.id);
    return await message.channel.send({ embeds: [embed] });
  }

  getBadges(
    user: FireUser,
    author: FireMember | FireUser,
    guild?: FireGuild,
    content?: string
  ) {
    const flags = user.flags?.toArray() || [];
    let emojis: string[] = [];
    if (guild && guild.ownerId == user.id) emojis.push(badges["OWNER"]);
    emojis.push(
      ...Object.keys(badges)
        .filter((badge: UserFlagsString) => flags.includes(badge))
        .map((badge) => badges[badge])
    );
    if (
      user.id == "190916650143318016" &&
      content?.toLowerCase().includes("staff")
    )
      emojis.push(badges.DISCORD_EMPLOYEE);
    if (user.isSuperuser()) emojis.push(badges.FIRE_ADMIN);
    if (user.premium) emojis.push(badges.FIRE_PREMIUM);
    if (emojis.length) emojis.push(zws);
    return emojis;
  }

  getInfo(message: FireMessage, member: FireMember | FireUser) {
    let user = member instanceof FireMember ? member.user : member;
    const now = moment();
    const cakeDay =
      now.dayOfYear() == moment(user.createdAt).dayOfYear() &&
      now.year() != moment(user.createdAt).year();
    let info = [
      `**${message.language.get("MENTION")}:** ${user.toMention()}`,
      `**${message.language.get("CREATED")}** ${Formatters.time(
        user.createdAt,
        "R"
      )}${cakeDay ? " 🎂" : ""}`,
    ];
    if (member instanceof FireMember) {
      if (
        message.guild &&
        message.guild.ownerId == member.id &&
        member.joinedTimestamp - message.guild.createdTimestamp < 5000
      )
        info.push(
          `**${message.language.get("CREATED_GUILD")}** ${Formatters.time(
            member.joinedAt,
            "R"
          )}`
        );
      else
        info.push(
          `**${message.language.get("JOINED")}** ${Formatters.time(
            member.joinedAt,
            "R"
          )}`
        );
      if (
        message.guild &&
        message.guild.members.cache.size / message.guild.memberCount > 0.98
      ) {
        const joinPos =
          message.guild.members.cache
            .sorted(
              (memberA, memberB) =>
                memberA.joinedTimestamp - memberB.joinedTimestamp
            )
            .toJSON()
            .indexOf(member) + 1;
        info.push(
          `**${message.language.get(
            "JOIN_POSITION"
          )}:** ${joinPos.toLocaleString(message.language.id)}`
        );
      }
      if (member && member.nickname && member.nickname != member.user.username)
        info.push(
          `**${message.language.get("NICKNAME")}:** ${member.nickname}`
        );
    }
    return info;
  }

  async getApplication(id: string) {
    return await this.client.req
      .applications(id)
      .rpc.get<Exclude<APIApplication, "rpc_origins" | "owner" | "team">>();
  }

  async getKsoftBan(message: FireMessage, user: FireUser) {
    if (!this.client.ksoft) return "";
    const banned = await this.client.ksoft.bans.info(user.id);
    if (banned instanceof Ban && banned.active)
      return `${emojis.error} ${message.language.get("USER_KSOFT_BANNED", {
        user: banned.user.id,
        reason: banned.reason,
        proof: banned.proof,
      })}`;
    return "";
  }

  async snowflakeInfo(
    message: FireMessage,
    snowflake: { snowflake: Snowflake } & DeconstructedSnowflake
  ) {
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
        (message.guild?.members.cache.get(snowflake.id) as FireMember).user ??
        snowflake.user;
      snowflake = {
        snowflake: snowflake.id,
        ...SnowflakeUtil.deconstruct(snowflake.id),
      };
    }

    let info = [
      `**${message.language.get("CREATED")}** ${Formatters.time(
        snowflake.date,
        "R"
      )}`,
      `**${message.language.get("TIMESTAMP")}:** ${snowflake.timestamp}`,
      `**${message.language.get("WORKER_ID")}:** ${snowflake.workerId}`,
      `**${message.language.get("PROCESS_ID")}:** ${snowflake.processId}`,
      `**${message.language.get("INCREMENT")}:** ${snowflake.increment}`,
    ];

    if (user && !message.guild?.members.cache.has(snowflake.snowflake))
      info.push(
        message.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
          type: message.language.get("USER"),
          extra: user.toString(),
        })
      );
    else if (user)
      info.push(
        message.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
          type: message.language.get("MEMBER"),
          extra: user.toString(),
        })
      );

    if (this.client.guilds.cache.has(snowflake.snowflake)) {
      const guild = this.client.guilds.cache.get(snowflake.snowflake);
      const member = await guild.members.fetch(message.author).catch(() => {});
      info.push(
        !!member
          ? message.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
              type: message.language.get("GUILD"),
              extra: guild.name,
            })
          : message.language.get("USER_SNOWFLAKE_BELONGS_TO", {
              type: message.language.get("GUILD"),
            })
      );
    }

    if (message.guild && message.guild.roles.cache.has(snowflake.snowflake))
      info.push(
        message.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
          type: message.language.get("ROLE"),
          extra: message.guild.roles.cache.get(snowflake.snowflake).toString(),
        })
      );

    const maybeEmoji = await centra(
      `https://cdn.discordapp.com/emojis/${snowflake.snowflake}`,
      "HEAD"
    )
      .header("User-Agent", this.client.manager.ua)
      .send();
    if (
      maybeEmoji.headers["content-type"] &&
      maybeEmoji.headers["content-type"].includes("image/")
    )
      info.push(
        message.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
          type: message.language.get("EMOJI"),
          extra:
            maybeEmoji.headers["content-type"] == "image/gif"
              ? `<a:emoji:${snowflake.snowflake}>`
              : `<:emoji:${snowflake.snowflake}>`,
        })
      );

    if (this.client.channels.cache.has(snowflake.snowflake)) {
      const channel = this.client.channels.cache.get(snowflake.snowflake);
      if (channel.type == "DM") {
        if ((channel as DMChannel).recipient.id == message.author.id)
          info.push(
            message.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
              type: message.language.get("CHANNEL"),
              extra: message.language.get("DM_CHANNEL"),
            })
          );
        else
          info.push(
            message.language.get("USER_SNOWFLAKE_BELONGS_TO", {
              type: message.language.get("CHANNEL"),
            })
          );
      } else if (channel instanceof ThreadChannel) {
        const members = await channel.members.fetch(false).catch(() => {});
        info.push(
          members && members.has(message.author.id)
            ? message.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
                type: message.language.get("THREAD"),
                extra: channel.toString(),
              })
            : message.language.get("USER_SNOWFLAKE_BELONGS_TO", {
                type: message.language.get("THREAD"),
              })
        );
        members && members.sweep(() => true);
      } else {
        const member = (channel as GuildChannel).guild.members.cache.get(
          message.author.id
        );
        info.push(
          member
            ?.permissionsIn(channel as GuildChannel)
            .has(Permissions.FLAGS.VIEW_CHANNEL)
            ? message.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
                type: message.language.get("CHANNEL"),
                extra: channel.toString(),
              })
            : message.language.get("USER_SNOWFLAKE_BELONGS_TO", {
                type: message.language.get("CHANNEL"),
              })
        );
      }
    }

    if (
      this.client.channels.cache
        .filter((c) => c.type == "GUILD_TEXT")
        .map((c: FireTextChannel) => c.messages.cache)
        .find((m) => m.has(snowflake.snowflake))
    ) {
      let viewable = false;
      const snowflakeMessage = this.client.channels.cache
        .filter((c) => c.type == "GUILD_TEXT")
        .map((c: FireTextChannel) => c.messages.cache)
        .find((m) => m.has(snowflake.snowflake))
        .get(snowflake.snowflake) as FireMessage;
      const channel = snowflakeMessage.channel;
      if (
        channel.type == "DM" &&
        (channel as DMChannel).recipient.id == message.author.id
      )
        viewable = true;
      else {
        const member = (channel as GuildChannel).guild.members.cache.get(
          message.author.id
        );
        if (
          member
            ?.permissionsIn(channel as GuildChannel)
            .has(Permissions.FLAGS.VIEW_CHANNEL)
        )
          viewable = true;
      }
      info.push(
        viewable
          ? message.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
              type: message.language.get("MESSAGE"),
              extra: `[${message.language.get("CLICK_TO_VIEW")}](${
                snowflakeMessage.url
              })`,
            })
          : message.language.get("USER_SNOWFLAKE_BELONGS_TO", {
              type: message.language.get("MESSAGE"),
            })
      );
    }

    if (
      this.client.channels.cache
        .filter((c) => c.type == "GUILD_TEXT")
        .map((c: FireTextChannel) => c.messages.cache)
        .find((c) => c.find((m) => m.attachments.has(snowflake.snowflake)))
    ) {
      let viewable = false;
      const snowflakeMessage = this.client.channels.cache
        .filter((c) => c.type == "GUILD_TEXT")
        .map((c: FireTextChannel) => c.messages.cache)
        .find((c) => c.find((m) => m.attachments.has(snowflake.snowflake)))
        .first() as FireMessage;
      const channel = snowflakeMessage.channel;
      if (
        channel.type == "DM" &&
        (channel as DMChannel).recipient.id == message.author.id
      )
        viewable = true;
      else {
        const member = (channel as GuildChannel).guild.members.cache.get(
          message.author.id
        );
        if (
          member
            ?.permissionsIn(channel as GuildChannel)
            .has(Permissions.FLAGS.VIEW_CHANNEL)
        )
          viewable = true;
      }
      info.push(
        viewable && snowflakeMessage.attachments.get(snowflake.snowflake)?.url
          ? message.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
              type: message.language.get("ATTACHMENT"),
              extra: `[${message.language.get("CLICK_TO_VIEW")}](${
                snowflakeMessage.attachments.get(snowflake.snowflake).url
              })`,
            })
          : message.language.get("USER_SNOWFLAKE_BELONGS_TO", {
              type: message.language.get("ATTACHMENT"),
            })
      );
    }

    let maybeGuild: boolean;
    if (!this.client.guilds.cache.has(snowflake.snowflake)) {
      maybeGuild = await this.client.req
        .guilds(snowflake.snowflake)
        .channels.get<APIChannel[]>()
        .then((c) => Array.isArray(c))
        .catch((e) => e instanceof DiscordAPIError && e.code == 50001);
      if (maybeGuild == true) {
        info.push(
          message.language.get("USER_SNOWFLAKE_BELONGS_TO", {
            type: message.language.get("GUILD"),
          })
        );
      }
    }

    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
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

    if (user || message.util?.parsed?.command?.id == "snowflake")
      embed.description = embed.description.split("\n").slice(2).join("\n");

    if (
      (this.client.guilds.cache.has(snowflake.snowflake) || maybeGuild) &&
      message.hasExperiment(4026299021, 1) &&
      this.client.manager.state.discordExperiments?.length
    ) {
      const experiments = await this.client.util.getFriendlyGuildExperiments(
        snowflake.snowflake,
        this.client.guilds.cache.get(snowflake.snowflake) as FireGuild
      );
      if (experiments.length)
        embed.addField(
          message.language.get("GUILD_EXPERIMENTS"),
          experiments.join("\n")
        );
    }

    return await message.channel.send({ embeds: [embed] });
  }
}
