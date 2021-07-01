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
  DMChannel,
  Snowflake,
} from "discord.js";
import { APIApplication, ApplicationFlags } from "discord-api-types";
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
      enableSlashCommand: true,
      aliases: ["userinfo", "infouser", "whois", "u"],
      restrictTo: "all",
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
    const badges = this.getBadges(user, message.author, message.guild);
    const info = this.getInfo(message, member ? member : user);
    let application: Exclude<APIApplication, "rpc_origins" | "owner" | "team">;
    if (user.bot)
      application = await this.getApplication(user.id).catch(() => null);
    const embed = new MessageEmbed()
      .setColor(color)
      .setTimestamp()
      .setAuthor(
        user.toString(),
        user.displayAvatarURL({
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
      const roles = member.roles.cache
        .filter((role) => role.id != message.guild.id)
        .sorted((roleA, roleB) => roleA.position - roleB.position)
        .map((role) => role.toString());
      if (roles.length)
        embed.addField(
          `» ${message.language.get("ROLES")} [${member.roles.cache.size - 1}]`,
          this.shorten(roles, 1000, " - "),
          false
        );
      const permissionsTranslated = (message.language.get("PERMISSIONS", {
        returnObjects: true,
      }) as unknown) as object;
      if (!member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
        let perms = [];
        const keyPerms: PermissionString[] = [
          "BAN_MEMBERS",
          "CHANGE_NICKNAME",
          "KICK_MEMBERS",
          "MANAGE_CHANNELS",
          "MANAGE_GUILD",
          "MANAGE_EMOJIS",
          "MANAGE_MESSAGES",
          "MANAGE_NICKNAMES",
          "MANAGE_ROLES",
          "MANAGE_WEBHOOKS",
          "MENTION_EVERYONE",
          "VIEW_AUDIT_LOG",
          "VIEW_GUILD_INSIGHTS",
        ];
        Object.keys(permissionsTranslated)
          .filter((permission: PermissionString) =>
            keyPerms.includes(permission)
          )
          .forEach((permission: PermissionString) => {
            if (member.permissions.has(permission))
              perms.push(permissionsTranslated[permission]);
          });
        if (perms.length)
          embed.addField(
            `» ${message.language.get("KEY_PERMISSIONS")}`,
            perms.join(", "),
            false
          );
      } else
        embed.addField(
          `» ${message.language.get("PERMISSIONS_TEXT")}`,
          permissionsTranslated["ADMINISTRATOR"],
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
        appInfo.push(
          `${emojis.success} ${message.language.get("USER_BOT_PUBLIC")}`
        );
      else
        appInfo.push(
          `${emojis.error} ${message.language.get("USER_BOT_PRIVATE")}`
        );
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
      else
        appInfo.push(
          `${emojis.error} ${message.language.get("USER_BOT_MEMBERS_INTENT")}`
        );
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
      else
        appInfo.push(
          `${emojis.error} ${message.language.get("USER_BOT_PRESENCE_INTENT")}`
        );
      if (user.bot && this.client.config.bots[user.id]?.best)
        appInfo.push(
          `${emojis.success} ${message.language.get("USER_BOT_BEST")}`
        );
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

  getBadges(user: FireUser, author: FireMember | FireUser, guild?: FireGuild) {
    const flags = user.flags?.toArray() || [];
    let emojis: string[] = [];
    if (guild && guild.ownerID == user.id) emojis.push(badges["OWNER"]);
    emojis.push(
      ...Object.keys(badges)
        .filter((badge: UserFlagsString) => flags.includes(badge))
        .map((badge) => badges[badge])
    );
    if (user.isSuperuser()) emojis.push(badges.FIRE_ADMIN);
    if (user.premium) emojis.push(badges.FIRE_PREMIUM);
    if (emojis.length) emojis.push(zws);
    return emojis;
  }

  getInfo(message: FireMessage, member: FireMember | FireUser) {
    let user = member instanceof FireMember ? member.user : member;
    const created = user.createdAt.toLocaleString(message.language.id);
    const now = moment();
    const cakeDay = now.dayOfYear() == moment(user.createdAt).dayOfYear();
    const createdDelta =
      humanize(
        moment(user.createdAt).diff(now),
        message.language.id.split("-")[0]
      ) + message.language.get("AGO");
    let info = [
      `**${message.language.get("MENTION")}:** ${user.toMention()}`,
      `**${message.language.get("CREATED")}:** ${created} (${createdDelta})${
        cakeDay ? " 🎂" : ""
      }`,
    ];
    if (member instanceof FireMember) {
      const joined = member.joinedAt.toLocaleString(message.language.id);
      const joinedDelta =
        humanize(
          moment(member.joinedAt).diff(now),
          message.language.id.split("-")[0]
        ) + message.language.get("AGO");
      if (
        message.guild &&
        message.guild.ownerID == member.id &&
        member.joinedTimestamp - message.guild.createdTimestamp < 5000
      )
        info.push(
          `**${message.language.get(
            "CREATED_GUILD"
          )}:** ${joined} (${joinedDelta})`
        );
      else
        info.push(
          `**${message.language.get("JOINED")}:** ${joined} (${joinedDelta})`
        );
      if (
        message.guild &&
        message.guild.members.cache.size / message.guild.memberCount > 0.98
      ) {
        const joinPos =
          message.guild.members.cache
            .sorted(
              (memberA, memberB) =>
                memberA.joinedTimestamp - memberB.joinedTimestamp // this may need to be reversed
            )
            .array()
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

  shorten(items: any[], max: number = 1000, sep: string = ", ") {
    let text = "";
    while (text.length < max && items.length) {
      text = text + `${items[0]}${sep}`;
      items.shift();
    }
    if (text.endsWith(sep)) text = text.slice(0, text.length - sep.length);
    if (items.length >= 1) return text + ` and ${items.length} more...`;
    return text;
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

    const created = snowflake.date.toLocaleString(message.language.id);
    const now = moment();
    const createdDelta = now.isBefore(snowflake.date)
      ? message.language.get("FROM_NOW", {
          time: humanize(
            moment(snowflake.date).diff(now),
            message.language.id.split("-")[0]
          ),
        })
      : message.language.get("AGO", {
          time: humanize(
            moment(snowflake.date).diff(now),
            message.language.id.split("-")[0]
          ),
        });

    let info = [
      `**${message.language.get("CREATED")}:** ${created} (${createdDelta})`,
      `**${message.language.get("TIMESTAMP")}:** ${snowflake.timestamp}`,
      `**${message.language.get("WORKER_ID")}:** ${snowflake.workerID}`,
      `**${message.language.get("PROCESS_ID")}:** ${snowflake.processID}`,
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
      info.push(
        guild.members.cache.has(message.author.id)
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

    if (this.client.emojis.cache.has(snowflake.snowflake))
      info.push(
        message.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
          type: message.language.get("EMOJI"),
          extra: this.client.emojis.cache.get(snowflake.snowflake).toString(),
        })
      );

    if (this.client.channels.cache.has(snowflake.snowflake)) {
      const channel = this.client.channels.cache.get(snowflake.snowflake);
      if (channel.type == "dm") {
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

    const maybeGuild = await this.client.req
      .guilds(snowflake.snowflake)
      .channels.get()
      .catch((e) => e);
    if (maybeGuild instanceof DiscordAPIError && maybeGuild.code == 50001) {
      info.push(
        message.language.get("USER_SNOWFLAKE_BELONGS_TO", {
          type: message.language.get("GUILD"),
        })
      );
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

    if (user)
      embed.description = embed.description.split("\n").slice(2).join("\n");

    if (
      (this.client.guilds.cache.has(snowflake.snowflake) || maybeGuild) &&
      message.hasExperiment(4026299021, 1) &&
      this.client.manager.state.discordExperiments?.length
    ) {
      const experiments = await this.client.util.getFriendlyGuildExperiments(
        snowflake.snowflake
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
