import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { constants, zws } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import * as centra from "centra";
import { Snowflake } from "discord-api-types/globals";
import {
  APIApplication,
  APIChannel,
  APIGuildMember,
  ApplicationFlags,
  PermissionFlagsBits,
} from "discord-api-types/v9";
import {
  ClientUser,
  DMChannel,
  DeconstructedSnowflake,
  DiscordAPIError,
  Formatters,
  GuildBasedChannel,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  SnowflakeUtil,
  ThreadChannel,
  UserFlagsString,
} from "discord.js";

const isValidURL = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

type InstallParams = {
  install_params?: {
    scopes: string[];
    permissions: string;
  };
  custom_install_url?: string;
};

enum JoinSourceType {
  UNSPECIFIED,
  BOT,
  INTEGRATION,
  DISCOVERY,
  HUB,
  INVITE,
  VANITY_URL,
  MANUAL_MEMBER_VERIFICATION,
}

const integrationEmojis = {
  twitch: "icons_TWITCH",
  youtube: "icons_YOUTUBE",
};

interface MembersSearchResult {
  guild_id: Snowflake;
  members: [
    {
      member: APIGuildMember;
      source_invite_code: string;
      join_source_type: JoinSourceType;
      inviter_id: Snowflake;
      integration_type?: number;
    },
  ];
  page_result_count: number;
  total_result_count: number;
}

export default class User extends Command {
  plsShutUp: number = 0;
  constructor() {
    super("user", {
      description: (language: Language) =>
        language.get("USER_COMMAND_DESCRIPTION"),
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
      restrictTo: "all",
      context: ["user"],
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage | ContextCommandMessage,
    args: {
      user?:
        | FireMember
        | FireUser
        | ({ snowflake: string } & DeconstructedSnowflake);
    }
  ) {
    if (typeof args.user == "undefined")
      args.user =
        command instanceof ContextCommandMessage
          ? (command.getMemberOrUser(false) ?? command.member ?? command.author)
          : (command.member ?? command.author);
    else if (
      args.user?.hasOwnProperty("snowflake") ||
      command.util?.parsed?.alias == "snowflake"
    )
      return await this.snowflakeInfo(
        command,
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
      if (command.member) {
        member = command.member;
        user = member.user;
      } else user = command.author;
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
    if (!member && user.id == command.author.id) member = command.member;
    if (user instanceof ClientUser) {
      member = command.guild?.members.cache.get(user.id) as FireMember;
      user = member.user;
    }
    let color = member ? member.displayColor : command.member?.displayColor;
    const botConfig = this.client.config.bots[user.id];
    if (user.bot && botConfig) color = botConfig.color;
    const badges = this.getBadges(
      user,
      command.author,
      command.guild,
      command.content
    );
    const [userInfo, memberInfo] = await this.getInfo(
      command,
      member ? member : user
    );
    let application: Exclude<APIApplication, "rpc_origins" | "owner" | "team"> &
      InstallParams;
    if (user.bot)
      application = await this.getApplication(
        botConfig?.appId ?? user.id
      ).catch(() => null);
    const components: MessageActionRow[] = [];
    const embed = new MessageEmbed()
      .setColor(color)
      .setAuthor({
        name: user.toString(),
        iconURL: user.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .addFields({
        name: `» ${command.language.get("ABOUT")}`,
        value: userInfo.join("\n"),
      });
    if (memberInfo.length)
      embed.addFields({
        name: `» ${command.language.get("MEMBER")}`,
        value: memberInfo.join("\n"),
      });
    if (user.flags.has("PROVISIONAL_ACCOUNT"))
      embed.setDescription(
        command.language.get("USER_PROVISIONAL_ACCOUNT", {
          learnMoreLink:
            "https://support.discord.com/hc/en-us/articles/29667419799063",
        })
      );
    if (badges.length)
      embed.setDescription(
        application
          ? `${badges.join("  ")}\n\n${application.description}`
          : badges.join("  ")
      );
    else if (application) embed.setDescription(application.description);
    if (member) {
      if (member?.avatar && member?.avatar != user.avatar)
        embed.setThumbnail(
          member.displayAvatarURL({ size: 2048, format: "png", dynamic: true })
        );
      const roles = member.roles.cache
        .filter((role) => role.id != command.guild.id)
        .sorted((roleA, roleB) => roleB.position - roleA.position)
        .map((role) => role.toString());
      if (roles.length)
        embed.addFields({
          name: `» ${command.language.get("ROLES")} [${
            member.roles.cache.size - 1
          }]`,
          value: this.client.util.shorten(roles, 1000, " - "),
        });
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        let perms = [];
        const keyPerms = [
          PermissionFlagsBits.BanMembers,
          PermissionFlagsBits.ChangeNickname,
          PermissionFlagsBits.KickMembers,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageGuild,
          PermissionFlagsBits.ManageGuildExpressions,
          PermissionFlagsBits.CreateGuildExpressions,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ManageNicknames,
          PermissionFlagsBits.ManageRoles,
          PermissionFlagsBits.ManageWebhooks,
          PermissionFlagsBits.MentionEveryone,
          PermissionFlagsBits.ViewAuditLog,
          PermissionFlagsBits.ViewGuildInsights,
          PermissionFlagsBits.ManageThreads,
          PermissionFlagsBits.ModerateMembers,
          PermissionFlagsBits.ManageEvents,
          PermissionFlagsBits.CreateEvents,
        ];
        for (const permission of keyPerms)
          if (member.permissions.has(permission))
            perms.push(
              this.client.util.cleanPermissionName(permission, command.language)
            );
        if (perms.length)
          embed.addFields({
            name: `» ${command.language.get("KEY_PERMISSIONS")}`,
            value: perms.join(", "),
          });
      } else
        embed.addFields({
          name: `» ${command.language.get("PERMISSIONS_TEXT")}`,
          value: this.client.util.cleanPermissionName(
            PermissionFlagsBits.Administrator,
            command.language
          ),
        });
    }
    if (application) {
      components.push(new MessageActionRow());
      const appInfo: string[] = [];
      if (application.bot_public)
        appInfo.push(command.language.getSuccess("USER_BOT_PUBLIC"));
      else appInfo.push(command.language.getError("USER_BOT_PRIVATE"));
      if (
        (application.flags & ApplicationFlags.GatewayGuildMembers) ==
          ApplicationFlags.GatewayGuildMembers ||
        (application.flags & ApplicationFlags.GatewayGuildMembersLimited) ==
          ApplicationFlags.GatewayGuildMembersLimited
      )
        appInfo.push(
          `${
            application.flags & ApplicationFlags.GatewayGuildMembers
              ? this.client.util.useEmoji("success")
              : this.client.util.useEmoji("warning")
          } ${command.language.get("USER_BOT_MEMBERS_INTENT")}`
        );
      else appInfo.push(command.language.getError("USER_BOT_MEMBERS_INTENT"));
      if (
        (application.flags & ApplicationFlags.GatewayPresence) ==
          ApplicationFlags.GatewayPresence ||
        (application.flags & ApplicationFlags.GatewayPresenceLimited) ==
          ApplicationFlags.GatewayPresenceLimited
      )
        appInfo.push(
          `${
            application.flags & ApplicationFlags.GatewayPresence
              ? this.client.util.useEmoji("success")
              : this.client.util.useEmoji("warning")
          } ${command.language.get("USER_BOT_PRESENCE_INTENT")}`
        );
      else appInfo.push(command.language.getError("USER_BOT_PRESENCE_INTENT"));
      if (
        (application.flags & ApplicationFlags.GatewayMessageContent) ==
          ApplicationFlags.GatewayMessageContent ||
        (application.flags & ApplicationFlags.GatewayMessageContentLimited) ==
          ApplicationFlags.GatewayMessageContentLimited
      )
        appInfo.push(
          `${
            application.flags & ApplicationFlags.GatewayMessageContent
              ? this.client.util.useEmoji("success")
              : this.client.util.useEmoji("warning")
          } ${command.language.get("USER_BOT_MESSAGE_CONTENT_INTENT")}`
        );
      else
        appInfo.push(
          command.language.getError("USER_BOT_MESSAGE_CONTENT_INTENT")
        );
      if (user.bot && botConfig?.best)
        appInfo.push(command.language.getSuccess("USER_BOT_BEST"));

      if (
        application.privacy_policy_url &&
        isValidURL(application.privacy_policy_url)
      )
        components[0].addComponents(
          new MessageButton()
            .setStyle("LINK")
            .setLabel(command.language.get("USER_BOT_PRIVACY_POLICY"))
            .setURL(application.privacy_policy_url)
        );
      if (
        application.terms_of_service_url &&
        isValidURL(application.terms_of_service_url)
      )
        components[0].addComponents(
          new MessageButton()
            .setStyle("LINK")
            .setLabel(command.language.get("USER_BOT_TERMS"))
            .setURL(application.terms_of_service_url)
        );

      if (application.install_params?.scopes.length) {
        let addURL = `https://discord.com/oauth2/authorize?client_id=${
          application.id
        }&scope=${application.install_params.scopes.join("%20")}`;
        if (application.install_params.permissions)
          addURL += `&permissions=${application.install_params.permissions}`;
        components[0].addComponents(
          new MessageButton()
            .setStyle("LINK")
            .setLabel(command.language.get("USER_BOT_ADD_TO_SERVER"))
            .setURL(addURL)
        );
      } else if (
        application.custom_install_url &&
        isValidURL(application.custom_install_url)
      )
        components[0].addComponents(
          new MessageButton()
            .setStyle("LINK")
            .setLabel(command.language.get("USER_BOT_ADD_TO_SERVER"))
            .setURL(application.custom_install_url)
        );

      embed.addFields({
        name: `» ${command.language.get("BOT")}`,
        value: appInfo.join("\n"),
      });
      if (components.every((row) => !row.components.length))
        while (components.length) components.pop();
    }
    member?.presence?.clientStatus
      ? embed.setFooter({
          text: user.id,
          iconURL: member.presence.activities.find(
            (activity) => activity.type == "STREAMING"
          )
            ? `https://cdn.discordapp.com/emojis/${
                this.client.util.getEmoji("STATUS_STREAMING").id
              }.png`
            : `https://cdn.discordapp.com/emojis/${
                this.client.util.getEmoji(
                  `STATUS_${member.presence.status.toUpperCase()}`
                ).id
              }.png`,
        })
      : embed.setFooter({ text: user.id });

    if (command.author.hasExperiment(3422641027, 1)) {
      if (member && !member.banner && !member.user.banner) await member.fetch();
      else if (user && !user.banner) await user.fetch();
      if (member && member.banner)
        embed.setImage(
          member.bannerURL({
            size: 2048,
            format: "png",
            dynamic: true,
          })
        );
      else if (user.banner)
        embed.setImage(
          user.bannerURL({
            size: 2048,
            format: "png",
            dynamic: true,
          })
        );
    }

    if (user instanceof FireUser && user.primaryGuild?.tag)
      embed.setThumbnail(
        process.env.NODE_ENV == "production"
          ? `https://server-tags.inv.wtf/${user.primaryGuild.guildId}/${user.primaryGuild.badge}/${user.primaryGuild.tag}`
          : `${this.client.manager.REST_HOST}/v2/img/tag/${user.primaryGuild.guildId}/${user.primaryGuild.badge}/${user.primaryGuild.tag}`
      );

    return await command.channel.send({ embeds: [embed], components });
  }

  getBadges(
    user: FireUser,
    author: FireMember | FireUser,
    guild?: FireGuild,
    content?: string
  ) {
    const flags = user.flags?.toArray() || [];
    let emojis: string[] = [];
    if (user.bot && flags.includes("VERIFIED_BOT"))
      emojis.push(
        this.client.util.useEmoji("VERIFIED_BOT1") +
          this.client.util.useEmoji("VERIFIED_BOT2")
      );
    if (guild && guild.ownerId == user.id)
      emojis.push(this.client.util.useEmoji("GUILD_OWNER"));
    if (user.isSuperuser())
      emojis.push(this.client.util.useEmoji("FIRE_ADMIN"));
    if (user.premium) emojis.push(this.client.util.useEmoji("FIRE_PLUS"));
    if (user.id == "159985870458322944")
      emojis.push(this.client.util.useEmoji("NO_MEE6"));
    emojis.push(
      ...constants.badges
        .filter((badge: UserFlagsString) => flags.includes(badge))
        .map((badge) => this.client.util.useEmoji(badge))
    );
    // useEmoji will return an empty string if the emoji is not found
    // so this will remove any empty strings from the list
    // which shouldn't happen but just in case
    emojis = emojis.filter((emoji) => !!emoji);
    if (emojis.length) emojis.push(zws);
    return emojis;
  }

  async getInfo(
    command: ApplicationCommandMessage | ContextCommandMessage,
    member: FireMember | FireUser
  ) {
    let user = member instanceof FireMember ? member.user : member;
    const now = new Date();
    const isCakeDay =
      now.getDate() == user.createdAt.getDate() &&
      now.getMonth() == user.createdAt.getMonth() &&
      now.getFullYear() != user.createdAt.getFullYear();
    let userInfo = [
      `**${command.language.get("MENTION")}:** ${user.toMention()}`,
      user.globalName
        ? `**${command.language.get("DISPLAY_NAME")}:**${
            member instanceof FireMember &&
            member.guild?.id == "342506939340685312"
              ? ":".repeat(++this.plsShutUp)
              : ""
          } ${user.globalName}`
        : undefined,
      `**${command.language.get("CREATED")}** ${Formatters.time(
        user.createdAt,
        "R"
      )}${isCakeDay ? " 🎂" : ""}`,
    ].filter((i) => !!i);
    let memberInfo = [];
    if (member instanceof FireMember) {
      const guild = command.guild;
      if (
        guild &&
        guild.ownerId == member.id &&
        member.joinedTimestamp - command.guild.createdTimestamp < 5000
      )
        memberInfo.push(
          `**${command.language.get("CREATED_GUILD")}** ${Formatters.time(
            member.joinedAt,
            "R"
          )}`
        );
      else
        memberInfo.push(
          `**${command.language.get("JOINED")}** ${Formatters.time(
            member.joinedAt,
            "R"
          )}`
        );

      if (member && member.nickname && member.nickname != member.user.username)
        memberInfo.push(
          `**${command.language.get("NICKNAME")}:** ${member.nickname}`
        );

      if (
        guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild) &&
        command.member?.permissions.has(PermissionFlagsBits.ManageGuild)
      ) {
        const membersSearchResult = (await this.client.req
          .guilds(command.guildId, "members-search")
          .post({
            data: {
              and_query: {
                user_id: {
                  or_query: [member.id],
                },
              },
              limit: 1,
            },
          })
          .catch(() => {})) as MembersSearchResult;

        const memberSearchData = membersSearchResult?.members?.find(
          (m) => m.member.user.id == member.id
        );
        if (memberSearchData) {
          const joinMethod = memberSearchData.join_source_type,
            inviteCode = memberSearchData.source_invite_code,
            inviterId = memberSearchData.inviter_id;

          if (joinMethod == JoinSourceType.BOT)
            memberInfo.push(
              `**${command.language.get(
                "JOIN_METHOD"
              )}:** ${command.language.get(`JOIN_METHODS.BOT`, {
                emoji: this.client.util.useEmoji("BOT_INVITE"),
              })}`
            );
          else if (joinMethod == JoinSourceType.INTEGRATION)
            memberInfo.push(
              `**${command.language.get(
                "JOIN_METHOD"
              )}:** ${command.language.get(`JOIN_METHODS.INTEGRATION`, {
                emoji: this.client.util.useEmoji("INTEGRATION"),
              })}`
            );
          else if (joinMethod == JoinSourceType.DISCOVERY)
            memberInfo.push(
              `**${command.language.get(
                "JOIN_METHOD"
              )}:** ${command.language.get(`JOIN_METHODS.DISCOVERY`, {
                emoji: this.client.util.useEmoji("SERVER_DISCOVERY"),
              })}`
            );
          else if (joinMethod == JoinSourceType.HUB)
            memberInfo.push(
              `**${command.language.get(
                "JOIN_METHOD"
              )}:** ${command.language.get(`JOIN_METHODS.HUB`, {
                emoji: this.client.util.useEmoji("STUDENT_HUB"),
              })}`
            );
          else if (
            joinMethod == JoinSourceType.INVITE ||
            joinMethod == JoinSourceType.VANITY_URL
          )
            memberInfo.push(
              `**${command.language.get(
                "JOIN_METHOD"
              )}:** ${command.language.get(`JOIN_METHODS.INVITE_LINK`, {
                emoji: this.client.util.useEmoji("INVITE_LINK"),
                invite: inviteCode,
              })}`
            );
          else if (joinMethod == JoinSourceType.MANUAL_MEMBER_VERIFICATION)
            memberInfo.push(
              `**${command.language.get(
                "JOIN_METHOD"
              )}:** ${command.language.get(`JOIN_METHODS.MANUAL_VERIFICATION`, {
                emoji: this.client.util.useEmoji("MANUAL_VERIFICATION"),
                invite: inviteCode,
              })}`
            );

          if (inviterId && joinMethod != JoinSourceType.INTEGRATION) {
            const inviter = await this.client.users
              .fetch(inviterId)
              .catch(() => {});
            if (inviter)
              memberInfo.push(
                `**${command.language.get(
                  "INVITED_BY"
                )}:** ${inviter.toString()} (${inviterId})`
              );
          } else if (inviterId) {
            const integrations = await guild.fetchIntegrations();
            if (integrations.has(inviterId)) {
              const inviter = integrations.get(inviterId);
              memberInfo.push(
                `**${command.language.get("INVITED_BY")}:**${
                  integrationEmojis[inviter.type]
                    ? ` ${this.client.util.useEmoji(
                        integrationEmojis[inviter.type]
                      )}`
                    : ""
                } ${inviter.name}`
              );
            }
          }
        }
      }
    }
    return [userInfo, memberInfo];
  }

  async getApplication(id: string) {
    return await this.client.req
      .applications(id)
      .rpc.get<Exclude<APIApplication, "rpc_origins" | "owner" | "team">>();
  }

  async snowflakeInfo(
    command: ApplicationCommandMessage | ContextCommandMessage,
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
        (command.guild?.members.cache.get(snowflake.id) as FireMember).user ??
        snowflake.user;
      snowflake = {
        snowflake: snowflake.id,
        ...SnowflakeUtil.deconstruct(snowflake.id),
      };
    }

    let info = [
      `**${command.language.get("CREATED")}** ${Formatters.time(
        snowflake.date,
        "R"
      )}`,
      `**${command.language.get("TIMESTAMP")}:** ${snowflake.timestamp}`,
      `**${command.language.get("WORKER_ID")}:** ${snowflake.workerId}`,
      `**${command.language.get("PROCESS_ID")}:** ${snowflake.processId}`,
      `**${command.language.get("INCREMENT")}:** ${snowflake.increment}`,
    ];

    if (user && !command.guild?.members.cache.has(snowflake.snowflake))
      info.push(
        command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
          type: command.language.get("USER"),
          extra: user.toString(),
        })
      );
    else if (user)
      info.push(
        command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
          type: command.language.get("MEMBER"),
          extra: user.toString(),
        })
      );

    if (this.client.guilds.cache.has(snowflake.snowflake)) {
      const guild = this.client.guilds.cache.get(snowflake.snowflake);
      const member = await guild.members.fetch(command.author).catch(() => {});
      info.push(
        !!member
          ? command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
              type: command.language.get("GUILD"),
              extra: guild.name,
            })
          : command.language.get("USER_SNOWFLAKE_BELONGS_TO", {
              type: command.language.get("GUILD"),
            })
      );
    }

    if (command.guild && command.guild.roles.cache.has(snowflake.snowflake))
      info.push(
        command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
          type: command.language.get("ROLE"),
          extra: command.guild.roles.cache.get(snowflake.snowflake).toString(),
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
        command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
          type: command.language.get("EMOJI"),
          extra:
            maybeEmoji.headers["content-type"] == "image/gif"
              ? `<a:emoji:${snowflake.snowflake}>`
              : `<:emoji:${snowflake.snowflake}>`,
        })
      );

    if (this.client.channels.cache.has(snowflake.snowflake)) {
      const channel = this.client.channels.cache.get(snowflake.snowflake);
      if (channel.type == "DM") {
        if ((channel as DMChannel).recipient.id == command.author.id)
          info.push(
            command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
              type: command.language.get("CHANNEL"),
              extra: command.language.get("DM_CHANNEL"),
            })
          );
        else
          info.push(
            command.language.get("USER_SNOWFLAKE_BELONGS_TO", {
              type: command.language.get("CHANNEL"),
            })
          );
      } else if (channel instanceof ThreadChannel) {
        const members = await channel.members
          .fetch({ cache: false })
          .catch(() => {});
        info.push(
          members && members.has(command.author.id)
            ? command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
                type: command.language.get("THREAD"),
                extra: channel.toString(),
              })
            : command.language.get("USER_SNOWFLAKE_BELONGS_TO", {
                type: command.language.get("THREAD"),
              })
        );
        members && members.sweep(() => true);
      } else {
        const member = (channel as GuildBasedChannel).guild.members.cache.get(
          command.author.id
        );
        info.push(
          member
            ?.permissionsIn(channel as GuildBasedChannel)
            .has(PermissionFlagsBits.ViewChannel)
            ? command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
                type: command.language.get("CHANNEL"),
                extra: channel.toString(),
              })
            : command.language.get("USER_SNOWFLAKE_BELONGS_TO", {
                type: command.language.get("CHANNEL"),
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
        (channel as DMChannel).recipient.id == command.author.id
      )
        viewable = true;
      else {
        const member = (channel as GuildBasedChannel).guild.members.cache.get(
          command.author.id
        );
        if (
          member
            ?.permissionsIn(channel as GuildBasedChannel)
            .has(PermissionFlagsBits.ViewChannel)
        )
          viewable = true;
      }
      info.push(
        viewable
          ? command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
              type: command.language.get("MESSAGE"),
              extra: `[${command.language.get("CLICK_TO_VIEW")}](${
                snowflakeMessage.url
              })`,
            })
          : command.language.get("USER_SNOWFLAKE_BELONGS_TO", {
              type: command.language.get("MESSAGE"),
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
        (channel as DMChannel).recipient.id == command.author.id
      )
        viewable = true;
      else {
        const member = (channel as GuildBasedChannel).guild.members.cache.get(
          command.author.id
        );
        if (
          member
            ?.permissionsIn(channel as GuildBasedChannel)
            .has(PermissionFlagsBits.ViewChannel)
        )
          viewable = true;
      }
      info.push(
        viewable && snowflakeMessage.attachments.get(snowflake.snowflake)?.url
          ? command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
              type: command.language.get("ATTACHMENT"),
              extra: `[${command.language.get("CLICK_TO_VIEW")}](${
                snowflakeMessage.attachments.get(snowflake.snowflake).url
              })`,
            })
          : command.language.get("USER_SNOWFLAKE_BELONGS_TO", {
              type: command.language.get("ATTACHMENT"),
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
          command.language.get("USER_SNOWFLAKE_BELONGS_TO", {
            type: command.language.get("GUILD"),
          })
        );
      }
    }

    const embed = new MessageEmbed()
      .setColor(command.member?.displayColor || "#FFFFFF")
      .setTimestamp(snowflake.date)
      .setAuthor({
        name: command.author.toString(),
        iconURL: command.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setDescription(
        command.language.get("USER_SNOWFLAKE_DESCRIPTION", {
          snowflakeemoji: this.client.util.useEmoji("snowflake"),
        })
      )
      .addFields({
        name: `» ${command.language.get("ABOUT")}`,
        value: info.join("\n"),
      });

    if (user || command.util?.parsed?.command?.id == "snowflake")
      embed.description = embed.description.split("\n").slice(2).join("\n");

    return await command.channel.send({ embeds: [embed] });
  }
}
