import { humanize, zws, constants } from "@fire/lib/util/constants";
import { snowflakeConverter } from "@fire/lib/util/converters";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { GuildPreview, MessageEmbed } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import * as moment from "moment";

const {
  emojis: {
    badges,
    badlyDrawnBadges,
    channels,
    badlyDrawnChannels,
    breadlyDrawnBadges: badlyDrawnBreadBadges,
  },
} = constants;

export default class GuildCommand extends Command {
  constructor() {
    super("guild", {
      description: (language: Language) =>
        language.get("GUILD_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
      args: [
        {
          id: "guild",
          type: "preview",
          default: undefined,
          required: false,
        },
      ],
      aliases: ["guildinfo", "infoguild", "serverinfo", "infoserver", "server"],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  getBadges(guild: FireGuild | GuildPreview, author?: FireMember | FireUser) {
    const bad = author?.hasExperiment("VxEOpzU63ddCPgD8HdKU5", 1);
    const badBread =
      author?.hasExperiment("VxEOpzU63ddCPgD8HdKU5", 3) ||
      author?.hasExperiment("w4y3qODd79XgvqjA_It3Z", 3);
    const emojis: string[] = [];

    if (guild.id == "564052798044504084") emojis.push(badges.FIRE_ADMIN);
    if (this.client.util?.premium.has(guild.id))
      emojis.push(badges.FIRE_PREMIUM);
    if (guild.features.includes("PARTNERED"))
      emojis.push(
        badBread
          ? badlyDrawnBreadBadges.PARTNERED
          : bad
          ? badlyDrawnBadges.PARTNERED
          : badges.PARTNERED
      );
    if (guild.features.includes("VERIFIED"))
      emojis.push(
        badBread
          ? badlyDrawnBreadBadges.VERIFIED
          : bad
          ? badlyDrawnBadges.VERIFIED
          : badges.VERIFIED
      );

    if (emojis.length) {
      emojis.push(zws);
    }

    return emojis;
  }

  async getInfo(message: FireMessage, guild: FireGuild | GuildPreview) {
    if (guild instanceof FireGuild) await guild.fetch(); // gets approximatePresenceCount

    const bad = message.author.hasExperiment("VxEOpzU63ddCPgD8HdKU5", 1);
    const language =
      guild instanceof FireGuild ? guild.language : message.language;
    const guildSnowflake = await snowflakeConverter(message, guild.id);
    const created =
      humanize(
        moment(
          guild instanceof FireGuild ? guild.createdAt : guildSnowflake.date
        ).diff(moment()),
        language.id.split("-")[0]
      ) + language.get("AGO");
    if (guild instanceof FireGuild && !guild.members.cache.has(guild.ownerID))
      await guild.members.fetch(guild.ownerID).catch(() => {});
    let messages = [
      message.language.get(
        "GUILD_CREATED_AT",
        guild instanceof FireGuild &&
          guild.owner.joinedTimestamp - guild.createdTimestamp < 5000
          ? guild.owner?.user?.discriminator != null
            ? guild.owner
            : "Unknown#0000"
          : null,
        created
      ),
      `**${message.language.get("MEMBERS")}:** ${(guild instanceof FireGuild
        ? guild.memberCount
        : guild.approximateMemberCount
      ).toLocaleString(message.language.id)}`,
      guild.approximatePresenceCount
        ? `**${message.language.get(
            "ONLINE"
          )}:** ${guild.approximatePresenceCount.toLocaleString(
            message.language.id
          )}`
        : null,
      guild instanceof FireGuild
        ? `**${message.language.get(
            "CHANNELS"
          )}:** ${guild.channels.cache.size.toLocaleString(
            message.language.id
          )} (${bad ? badlyDrawnChannels.text : channels.text} ${
            guild.channels.cache.filter((channel) => channel.type == "text")
              .size
          }, ${bad ? badlyDrawnChannels.voice : channels.voice} ${
            guild.channels.cache.filter((channel) => channel.type == "voice")
              .size
          }, ${bad ? badlyDrawnChannels.news : channels.news} ${
            guild.channels.cache.filter((channel) => channel.type == "news")
              .size
          })`
        : null,
      guild instanceof FireGuild
        ? `**${message.language.get("REGION")}:** ${
            message.language.get("REGIONS")[guild.region] ||
            message.language.get("REGION_DEPRECATED")
          }`
        : null,
    ];
    if (
      guild instanceof FireGuild &&
      guild.members.cache.size / guild.memberCount > 0.98
    )
      messages.push(
        message.language.get(
          "GUILD_JOIN_POS",
          (
            guild.members.cache
              .array()
              .sort((one, two) => (one.joinedAt > two.joinedAt ? 1 : -1))
              .indexOf(message.member) + 1
          ).toLocaleString(message.language.id)
        )
      );
    return messages.filter((message) => !!message);
  }

  getSecurity(guild: FireGuild | GuildPreview) {
    const info: string[] = [];
    if (!(guild instanceof FireGuild)) return info;

    const VERIFICATION_LEVEL_EMOJI = {
      VERY_HIGH: constants.emojis.green,
      HIGH: constants.emojis.green,
      MEDIUM: constants.emojis.yellow,
      LOW: constants.emojis.red,
      NONE: constants.emojis.red,
    };

    const emoji = VERIFICATION_LEVEL_EMOJI[guild.verificationLevel];
    info.push(
      `${emoji} ${guild.language.get(`GUILD_VERIF_${guild.verificationLevel}`)}`
    );

    switch (guild.explicitContentFilter) {
      case "ALL_MEMBERS":
        info.push(
          `${constants.emojis.green} ${guild.language.get("GUILD_FILTER_ALL")}`
        );
        break;
      case "MEMBERS_WITHOUT_ROLES":
        info.push(
          `${constants.emojis.yellow} ${guild.language.get(
            "GUILD_FILTER_NO_ROLE"
          )}`
        );
        break;
      case "DISABLED":
        info.push(
          `${constants.emojis.red} ${guild.language.get("GUILD_FILTER_NONE")}`
        );
        break;
    }

    if (guild.defaultMessageNotifications == "MENTIONS")
      info.push(
        `${constants.emojis.green} ${guild.language.get(
          "GUILD_NOTIFS_MENTIONS"
        )}`
      );
    else
      info.push(
        `${constants.emojis.yellow} ${guild.language.get("GUILD_NOTIFS_ALL")}`
      );

    if (guild.mfaLevel)
      info.push(
        `${constants.emojis.green} ${guild.language.get("GUILD_MFA_ENABLED")}`
      );
    else
      info.push(
        `${constants.emojis.red} ${guild.language.get("GUILD_MFA_NONE")}`
      );

    return info;
  }

  shorten(items: any[], max = 1000, sep = ", ") {
    let text = "";

    while (text.length < max && items.length > 0) {
      text += `${items.shift()}${sep}`;
    }

    if (text.endsWith(sep)) text = text.slice(0, text.length - sep.length);

    return items.length > 0 && text.length < 11 + items.toString().length
      ? `${text} and ${items.length} more...`
      : text;
  }

  async exec(message: FireMessage, args: { guild?: GuildPreview | FireGuild }) {
    if (!args.guild && typeof args.guild != "undefined") return;
    const guild = args.guild ? args.guild : message.guild;

    const badges = this.getBadges(guild, message.author);
    const info = await this.getInfo(message, guild);
    const security = this.getSecurity(guild);

    const featuresLocalization = message.language.get("FEATURES");
    const features: string[] = guild.features
      .filter((feature) => featuresLocalization.hasOwnProperty(feature))
      .map((feature) => featuresLocalization[feature]);

    const roles =
      guild instanceof FireGuild
        ? guild.roles.cache
            .sort((one, two) => (one.position > two.position ? 1 : -1))
            .filter((role) => guild.id != role.id)
            .map((role) =>
              guild == message.guild ? role.toString() : role.name
            )
        : null;

    const embed = new MessageEmbed()
      .setDescription(badges.join(" "))
      .setColor(message.member?.displayHexColor || "#ffffff")
      .setAuthor(
        guild.name,
        guild.iconURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .setFooter(guild.id)
      .setTimestamp();
    if (info.length) embed.addField(message.language.get("GUILD_ABOUT"), info);
    if (security.length)
      embed.addField(message.language.get("GUILD_SECURITY"), security);

    if (features.length > 0) {
      embed.addField(
        message.language.get("GUILD_FEATURES"),
        features.join(", ")
      );
    }

    if (guild instanceof FireGuild && roles?.length)
      embed.addField(
        message.language.get("GUILD_ROLES") +
          ` [${guild.roles.cache.array().length}]`,
        this.shorten(roles, 1000, " - ")
      );

    await message.channel.send(embed);
  }
}
