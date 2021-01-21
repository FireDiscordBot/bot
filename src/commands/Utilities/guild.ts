import { humanize, zws, constants } from "../../../lib/util/constants";
import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { FireGuild } from "../../../lib/extensions/guild";
import { FireUser } from "../../../lib/extensions/user";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { MessageEmbed } from "discord.js";
import * as moment from "moment";

const {
  emojis: { badges, badlyDrawnBadges, channels, badlyDrawnChannels },
} = constants;

export default class GuildCommand extends Command {
  constructor() {
    super("guild", {
      description: (language: Language) =>
        language.get("GUILD_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
      aliases: ["guildinfo", "infoguild", "serverinfo", "infoserver", "server"],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  getBadges(guild: FireGuild, author?: FireMember | FireUser) {
    const bad = author?.hasExperiment("VxEOpzU63ddCPgD8HdKU5", 1);
    const emojis: string[] = [];

    if (guild.id == "564052798044504084") emojis.push(badges.FIRE_ADMIN);
    if (guild.premium) emojis.push(badges.FIRE_PREMIUM);
    if (guild.features.includes("PARTNERED"))
      emojis.push(bad ? badges.PARTNERED : badlyDrawnBadges.PARTNERED);
    if (guild.features.includes("VERIFIED"))
      emojis.push(bad ? badges.VERIFIED : badlyDrawnBadges.VERIFIED);

    if (emojis.length) {
      emojis.push(zws);
    }

    return emojis;
  }

  async getInfo(message: FireMessage, guild: FireGuild) {
    const bad = message.author.hasExperiment("VxEOpzU63ddCPgD8HdKU5", 1);
    const created =
      humanize(
        moment(guild.createdAt).diff(moment()),
        guild.language.id.split("-")[0]
      ) + " ago";
    if (!guild.members.cache.has(guild.ownerID))
      await guild.members.fetch(guild.ownerID).catch(() => {});
    let messages = [
      message.language.get(
        "GUILD_CREATED_AT",
        guild.owner?.user?.discriminator != null ? guild.owner : "Unknown#0000",
        created
      ),
      `**${message.language.get(
        "MEMBERS"
      )}:** ${guild.memberCount.toLocaleString(message.language.id)}`,
      `**${message.language.get(
        "CHANNELS"
      )}:** ${guild.channels.cache.size.toLocaleString(message.language.id)} (${
        bad ? channels.text : badlyDrawnChannels.text
      } ${
        guild.channels.cache.filter((channel) => channel.type == "text").size
      }, ${bad ? channels.voice : badlyDrawnChannels.voice} ${
        guild.channels.cache.filter((channel) => channel.type == "voice").size
      }, ${bad ? channels.news : badlyDrawnChannels} ${
        guild.channels.cache.filter((channel) => channel.type == "news").size
      })`,
      `**${message.language.get("REGION")}:** ${
        message.language.get("REGIONS")[guild.region] ||
        message.language.get("REGION_DEPRECATED")
      }`,
    ];
    if (guild.members.cache.size / guild.memberCount > 0.98)
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
    return messages;
  }

  getSecurity(guild: FireGuild) {
    const info: string[] = [];

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

  async exec(message: FireMessage) {
    const badges = this.getBadges(message.guild, message.author);
    const info = await this.getInfo(message, message.guild);
    const security = this.getSecurity(message.guild);

    const featuresLocalization = message.language.get("FEATURES");
    const features: string[] = message.guild.features
      .filter((feature) => featuresLocalization.hasOwnProperty(feature))
      .map((feature) => featuresLocalization[feature]);

    const roles = message.guild.roles.cache
      .sort((one, two) => (one.position > two.position ? 1 : -1))
      .filter((role) => message.guild.id != role.id)
      .map((role) => role.toString());

    const embed = new MessageEmbed()
      .setDescription(badges.join(" "))
      .setColor(message.member?.displayColor || "#ffffff")
      .setAuthor(
        message.guild.name,
        message.guild.iconURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .addField(message.language.get("GUILD_ABOUT"), info)
      .addField(message.language.get("GUILD_SECURITY"), security);

    if (features.length > 0) {
      embed.addField(
        message.language.get("GUILD_FEATURES"),
        features.join(", ")
      );
    }

    embed
      .addField(
        message.language.get("GUILD_ROLES") +
          ` [${message.guild.roles.cache.array().length}]`,
        this.shorten(roles, 1000, " - ")
      )
      .setFooter(message.guild.id)
      .setTimestamp();

    await message.channel.send(embed);
  }
}
