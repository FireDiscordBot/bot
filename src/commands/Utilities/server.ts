import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { constants, zws } from "@fire/lib/util/constants";
import {
  guildPreviewConverter,
  snowflakeConverter,
} from "@fire/lib/util/converters";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import * as centra from "centra";
import {
  Formatters,
  GuildPreview,
  Invite,
  InviteGuild,
  MessageEmbed,
} from "discord.js";

type ShardInfo = { shardId: number; clusterId: number };

export type InviteGuildWithCounts = InviteGuild & {
  memberCount: number;
  approximatePresenceCount: number;
};

export type InviteWithGuildCounts = Invite & {
  guild: FireGuild | InviteGuildWithCounts;
};

export default class GuildCommand extends Command {
  constructor() {
    super("server", {
      description: (language: Language) =>
        language.get("GUILD_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "guild",
          type: "preview",
          description: (language: Language) =>
            language.get("GUILD_ARGUMENT_PREVIEW_DESCRIPTION"),
          default: undefined,
          required: false,
        },
      ],
      aliases: ["guild"], // for slash only warning to alert users to it being /server now
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
    });
  }

  getBadges(
    guild: FireGuild | GuildPreview | InviteGuildWithCounts,
    author?: FireMember | FireUser
  ) {
    let emojis: string[] = [];

    if (guild.id == "564052798044504084")
      emojis.push(this.client.util.useEmoji("FIRE_ADMIN"));
    if (this.client.util?.premium.has(guild.id))
      emojis.push(this.client.util.useEmoji("FIRE_PREMIUM"));
    if (guild.features.includes("PARTNERED"))
      emojis.push(this.client.util.useEmoji("PARTNERED"));
    if (guild.features.includes("VERIFIED"))
      emojis.push(this.client.util.useEmoji("VERIFIED"));

    // useEmoji will return an empty string if the emoji is not found
    // so this will remove any empty strings from the list
    // which shouldn't happen but just in case
    emojis = emojis.filter((emoji) => !!emoji);
    if (emojis.length) emojis.push(zws);

    return emojis;
  }

  async getInfo(
    command: ApplicationCommandMessage,
    guild: FireGuild | GuildPreview | InviteGuildWithCounts
  ) {
    if (guild instanceof FireGuild) await guild.fetch(); // gets approximatePresenceCount

    const guildSnowflake = await snowflakeConverter(command, guild.id);
    let owner: FireMember;
    if (guild instanceof FireGuild) owner = await guild.fetchOwner();
    const ownerString =
      guild instanceof FireGuild &&
      owner &&
      owner.joinedTimestamp - guild.createdTimestamp < 5000
        ? owner?.user?.discriminator != null
          ? owner.toString()
          : "Unknown#0000"
        : null;
    let messages = [
      command.language.get(
        ownerString ? "GUILD_CREATED_BY" : "GUILD_CREATED_AT",
        {
          owner: ownerString,
          created: Formatters.time(
            guild instanceof FireGuild ? guild.createdAt : guildSnowflake.date,
            "R"
          ),
        }
      ),
      `**${command.language.get("MEMBERS")}:** ${(guild instanceof FireGuild ||
      guild instanceof InviteGuild
        ? guild.memberCount
        : guild.approximateMemberCount
      ).toLocaleString(command.language.id)}`,
      guild.approximatePresenceCount
        ? `**${command.language.get(
            "ONLINE"
          )}:** ${guild.approximatePresenceCount.toLocaleString(
            command.language.id
          )}`
        : null,
      guild instanceof GuildPreview && guild.emojis.size
        ? `**${command.language.get(
            "EMOJIS"
          )}:** ${guild.emojis.size.toLocaleString(command.language.id)}`
        : null,
      guild instanceof FireGuild
        ? `**${command.language.get(
            guild.regions.length > 1 ? "REGION_PLURAL" : "REGION"
          )}:** ${
            guild.regions.length > 1
              ? guild.regions
                  .map((region) =>
                    region && command.language.has(`REGIONS.${region}`)
                      ? command.language.get(
                          `REGIONS.${region}` as unknown as LanguageKeys,
                          {
                            automaticEmoji:
                              this.client.util.useEmoji("REGION_WUMPUS"),
                          }
                        )
                      : command.language.get("REGION_AUTOMATIC", {
                          automaticEmoji:
                            this.client.util.useEmoji("REGION_WUMPUS"),
                        })
                  )
                  .join(", ")
              : command.language.get("REGION_AUTOMATIC", {
                  automaticEmoji: this.client.util.useEmoji("REGION_WUMPUS"),
                })
          }`
        : null,
    ];
    if (
      guild instanceof FireGuild &&
      guild.members.cache.size / guild.memberCount > 0.98
    )
      messages.push(
        command.language.get("GUILD_JOIN_POS", {
          pos: (
            guild.members.cache
              .sort((one, two) => (one.joinedAt > two.joinedAt ? 1 : -1))
              .toJSON()
              .indexOf(command.member) + 1
          ).toLocaleString(command.language.id),
        })
      );
    return messages.filter((message) => !!message);
  }

  getSecurity(
    command: ApplicationCommandMessage,
    guild: FireGuild | GuildPreview | InviteGuildWithCounts
  ) {
    const info: string[] = [];
    if (guild instanceof GuildPreview) return info;

    const VERIFICATION_LEVEL_EMOJI = {
      VERY_HIGH: this.client.util.useEmoji("statuspage_operational"),
      HIGH: this.client.util.useEmoji("statuspage_operational"),
      MEDIUM: this.client.util.useEmoji("statuspage_partial"),
      LOW: this.client.util.useEmoji("statuspage_major"),
      NONE: this.client.util.useEmoji("statuspage_major"),
    };

    const emoji = VERIFICATION_LEVEL_EMOJI[guild.verificationLevel];
    info.push(
      `${emoji} ${command.language.get(
        `GUILD_VERIF_${guild.verificationLevel}`
      )}`
    );

    if (guild instanceof FireGuild) {
      switch (guild.explicitContentFilter) {
        case "ALL_MEMBERS":
          info.push(
            `${this.client.util.useEmoji(
              "statuspage_operational"
            )} ${command.language.get("GUILD_FILTER_ALL")}`
          );
          break;
        case "MEMBERS_WITHOUT_ROLES":
          info.push(
            `${this.client.util.useEmoji(
              "statuspage_partial"
            )} ${command.language.get("GUILD_FILTER_NO_ROLE")}`
          );
          break;
        case "DISABLED":
          info.push(
            `${this.client.util.useEmoji(
              "statuspage_major"
            )} ${command.language.get("GUILD_FILTER_NONE")}`
          );
          break;
      }

      if (guild.defaultMessageNotifications == "ONLY_MENTIONS")
        info.push(
          `${this.client.util.useEmoji(
            "statuspage_operational"
          )} ${command.language.get("GUILD_NOTIFS_MENTIONS")}`
        );
      else
        info.push(
          `${this.client.util.useEmoji(
            "statuspage_partial"
          )} ${command.language.get("GUILD_NOTIFS_ALL")}`
        );

      if (guild.mfaLevel == "ELEVATED")
        info.push(
          `${this.client.util.useEmoji(
            "statuspage_operational"
          )} ${command.language.get("GUILD_MFA_ENABLED")}`
        );
      else
        info.push(
          `${this.client.util.useEmoji(
            "statuspage_major"
          )} ${command.language.get("GUILD_MFA_NONE")}`
        );
    }

    return info;
  }

  getInviteInfo(command: ApplicationCommandMessage, invite: Invite) {
    const info = [];
    if (!invite) return info;
    info.push(
      `**${command.language.get("CHANNEL")}:** #${invite.channel?.name}`
    );
    if (invite.inviter)
      info.push(
        `**${command.language.get("INVITER")}:** ${invite.inviter.toString()}`
      );
    if (invite.expiresAt)
      info.push(
        `**${command.language.get("EXPIRES")}:** ${Formatters.time(
          invite.expiresAt,
          "R"
        )}`
      );
    if (invite.uses)
      info.push(
        `**${command.language.get("USES")}:** ${invite.uses.toLocaleString(
          command.language.id
        )}`
      );
    if (invite.maxUses)
      info.push(
        `**${command.language.get(
          "MAX_USES"
        )}:** ${invite.maxUses.toLocaleString(command.language.id)}`
      );
    if (invite.temporary)
      info.push(
        `**${command.language.get(
          "TEMPORARY_MEMBERSHIP"
        )}:** ${command.language.get("YES")}`
      );
    else
      info.push(
        `**${command.language.get(
          "TEMPORARY_MEMBERSHIP"
        )}:** ${command.language.get("NO")}`
      );
    return info;
  }

  getChannels(
    command: ApplicationCommandMessage,
    guild: FireGuild | GuildPreview | InviteGuildWithCounts
  ) {
    if (!(guild instanceof FireGuild)) return null;
    return {
      [command.language.get("TOTAL") + ":"]: guild.channels.cache.size,
      [this.client.util.useEmoji("GUILD_CATEGORY")]:
        guild.channels.cache.filter(
          (channel) => channel.type == "GUILD_CATEGORY"
        ).size,
      [this.client.util.useEmoji("GUILD_TEXT")]: guild.channels.cache.filter(
        (channel) => channel.type == "GUILD_TEXT"
      ).size,
      [this.client.util.useEmoji("GUILD_VOICE")]: guild.channels.cache.filter(
        (channel) => channel.type == "GUILD_VOICE"
      ).size,
      [this.client.util.useEmoji("GUILD_NEWS")]: guild.channels.cache.filter(
        (channel) => channel.type == "GUILD_NEWS"
      ).size,
      [this.client.util.useEmoji("GUILD_STAGE_VOICE")]:
        guild.channels.cache.filter(
          (channel) => channel.type == "GUILD_STAGE_VOICE"
        ).size,
      [this.client.util.useEmoji("GUILD_FORUM")]: guild.channels.cache.filter(
        (channel) => channel.type == "GUILD_FORUM"
      ).size,
      [this.client.util.useEmoji("GUILD_THREAD")]: guild.channels.cache.filter(
        (channel) => channel.isThread()
      ).size,
    };
  }

  async run(
    command: ApplicationCommandMessage,
    args: { guild?: GuildPreview | FireGuild | InviteGuildWithCounts }
  ) {
    let invite: InviteWithGuildCounts;
    if (args.guild instanceof Invite) {
      invite = args.guild as unknown as InviteWithGuildCounts;
      args.guild = invite.guild as FireGuild | InviteGuildWithCounts;
    }
    if (!command.guild && !args.guild) {
      if (!command.guildId)
        return await command.error("GUILD_INPUT_REQUIRED", {
          invite: this.client.config.inviteLink,
        });
      const preview = await guildPreviewConverter(command, command.guildId);
      if (preview) args.guild = preview;
      else
        return await command.error("GUILD_INPUT_REQUIRED", {
          invite: this.client.config.inviteLink,
        });
    }
    if (!args.guild && typeof args.guild != "undefined") return;
    const guild = args.guild ? args.guild : command.guild;

    const badges = this.getBadges(guild, command.author);
    const info = await this.getInfo(command, guild);
    const inviteInfo = await this.getInviteInfo(command, invite);
    const security = this.getSecurity(command, guild);
    const channels = this.getChannels(command, guild);

    const features: string[] = guild.features
      .filter((feature) => {
        // Remove features that are unnecessary to display
        if (feature == "PARTNERED" || feature == "VERIFIED") return false; // These are already displayed as badges
        if (
          feature == "VANITY_URL" &&
          invite?.code &&
          invite.code == invite.guild.vanityURLCode
        )
          return false;
        return true;
      })
      .map((feature) =>
        this.client.util.cleanFeatureName(feature, command.language)
      )
      .sort();

    const roles =
      guild instanceof FireGuild
        ? guild.roles.cache
            .sort((one, two) => (one.position > two.position ? 1 : -1))
            .filter((role) => guild.id != role.id)
            .map((role) =>
              guild == command.guild ? role.toString() : role.name
            )
        : null;

    const embed = new MessageEmbed()
      .setDescription(
        guild.description
          ? `${badges.join(" ")}\n\n${guild.description}`
          : badges.join(" ")
      )
      .setColor(command.member?.displayColor || "#FFFFFF")
      .setAuthor({
        name: guild.name,
        iconURL: guild.iconURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setFooter({ text: guild.id })
      .setTimestamp()
      .addFields(
        [
          info.length
            ? {
                name: command.language.get("GUILD_ABOUT"),
                value: info.join("\n"),
              }
            : null,
          inviteInfo.length
            ? {
                name: command.language.get("GUILD_INVITE"),
                value: inviteInfo.join("\n"),
              }
            : null,
          security.length
            ? {
                name: command.language.get("GUILD_SECURITY"),
                value: security.join("\n"),
              }
            : null,
          channels && Object.values(channels).some((v) => v > 0)
            ? {
                name: command.language.get("GUILD_CHANNELS"),
                value: Object.entries(channels)
                  .filter(([, value]) => value > 0)
                  .map(([k, v]) => `${k} ${v}`)
                  .join(" | "),
              }
            : null,
          features.length > 0
            ? {
                name: command.language.get("GUILD_FEATURES"),
                value: features.join(", "),
              }
            : null,
          guild instanceof FireGuild && roles?.length
            ? {
                name:
                  command.language.get("GUILD_ROLES") +
                  ` [${guild.roles.cache.size - 1}]`,
                value: this.client.util.shorten(roles, 1000, " - "),
              }
            : null,
        ].filter((field) => !!field)
      );

    if (command.author.isSuperuser() && this.client.manager.REST_HOST) {
      // we make a request so we can get the cluster id too
      const shardReq: ShardInfo = await (
        await centra(
          `${this.client.manager.REST_HOST}/${this.client.manager.CURRENT_REST_VERSION}/shard/${guild.id}`
        )
          .header("User-Agent", this.client.manager.ua)
          .send()
      )
        .json()
        .catch(() => ({ shardId: -1, clusterId: -1 }));
      if (shardReq.shardId != -1)
        embed.addFields({
          name: command.language.get("SHARD"),
          value: shardReq.shardId.toString(),
          inline: true,
        });
      if (shardReq.clusterId != -1)
        embed.addFields({
          name: command.language.get("CLUSTER"),
          value: shardReq.clusterId.toString(),
          inline: true,
        });
    }

    await command.channel.send({ embeds: [embed] });
  }
}
