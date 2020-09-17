import { humanize, zws, constants } from "../../../lib/util/constants";
import { FireMessage } from "../../../lib/extensions/message";
import { FireGuild } from "../../../lib/extensions/guild";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import * as moment from "moment";

export default class GuildCommand extends Command {
  constructor() {
    super("guild", {
      description: (language: Language) =>
        language.get("GUILD_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
      aliases: ["guildinfo", "infoguild", "serverinfo", "infoserver", "server"],
      category: "Utilities",
    });
  }

  getBadges(guild: FireGuild) {
    let badges: string[] = [];
    if (guild.id == "564052798044504084")
      badges.push(
        this.client.emojis.cache.get("671243744774848512").toString()
      );
    if (guild.features.includes("PARTNERED"))
      badges.push(
        this.client.emojis.cache.get("748876805011931188").toString()
      );
    if (guild.features.includes("VERIFIED"))
      badges.push(
        this.client.emojis.cache.get("751196492517081189").toString()
      );
    // TODO add premium badge
    return badges
      ? () => {
          badges.push(zws);
          return badges;
        }
      : [];
  }

  getInfo(message: FireMessage, guild: FireGuild) {
    const created =
      humanize(
        moment(guild.createdAt).diff(moment()),
        guild.language.id.split("-")[0]
      ) + " ago";
    return [
      message.language.get("GUILD_CREATED_AT", guild, created),
      `**${message.language.get(
        "MEMBERS"
      )}:** ${guild.memberCount.toLocaleString()}`,
      `**${message.language.get("REGION")}:** ${
        message.language.get("REGIONS")[guild.region] ||
        message.language.get("REGION_DEPRECATED")
      }`,
      message.language.get(
        "GUILD_JOIN_POS",
        (
          guild.members.cache
            .array()
            .sort((one, two) => (one.joinedAt > two.joinedAt ? 1 : -1))
            .indexOf(message.member) + 1
        ).toLocaleString()
      ),
    ];
  }

  getSecurity(guild: FireGuild) {
    let info: string[] = [];
    switch (guild.verificationLevel) {
      case "VERY_HIGH":
        info.push(
          `${constants.emojis.green} ${guild.language.get(
            "GUILD_VERIF_VERY_HIGH"
          )}`
        );
        break;
      case "HIGH":
        info.push(
          `${constants.emojis.green} ${guild.language.get("GUILD_VERIF_HIGH")}`
        );
        break;
      case "MEDIUM":
        info.push(
          `${constants.emojis.yellow} ${guild.language.get(
            "GUILD_VERIF_MEDIUM"
          )}`
        );
        break;
      case "LOW":
        info.push(
          `${constants.emojis.red} ${guild.language.get("GUILD_VERIF_LOW")}`
        );
        break;
      case "NONE":
        info.push(
          `${constants.emojis.red} ${guild.language.get("GUILD_VERIF_NONE")}`
        );
        break;
    }
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
        `${constants.emojis.red} ${guild.language.get("GUILD_MFA_DISABLED")}`
      );
    return info;
  }

  shorten(items: Array<any>, max: number = 1000, sep: string = ", ") {
    let text = "";
    while (text.length < max && items.length) {
      text += `${items[0]}${sep}`;
      items = items.slice(1);
    }
    if (text.endsWith(sep)) text = text.slice(0, text.length - sep.length);
    if (items.length && text.length < 11 + items.toString().length)
      return text + ` and ${items.length} more...`;
    return text;
  }

  async exec(message: FireMessage) {
    const badges = this.getBadges(message.guild);
    const info = this.getInfo(message, message.guild);
    const security = this.getSecurity(message.guild);
    let features = [];
    message.guild.features.forEach((value) => {
      if (message.language.get("FEATURES").hasOwnProperty(value))
        features.push(message.language.get("FEATURES")[value]);
    });
    let roles = [];
    message.guild.roles.cache
      .sort((one, two) => (one.position > two.position ? 1 : -1))
      .forEach((value) => {
        if (!(message.guild.id == value.id)) roles.push(value.toString());
      });
    const embed = {
      description: badges,
      color: message.member?.displayColor || "#ffffff",
      author: {
        name: message.guild.name,
        icon_url: message.guild.iconURL({
          size: 2048,
          format: message.guild.icon.startsWith("a_") ? "gif" : "png",
        }),
      },
      fields: [
        {
          value: info,
          name: message.language.get("GUILD_ABOUT"),
          inline: false,
        },
        {
          value: security,
          name: message.language.get("GUILD_SECURITY"),
          inline: false,
        },
        {
          value: features.join(", "),
          name: message.language.get("GUILD_FEATURES"),
          inline: false,
        },
        {
          value: this.shorten(roles, 1000, " - "),
          name:
            message.language.get("GUILD_ROLES") +
            `[${message.guild.roles.cache.array().length}]`,
          inline: false,
        },
      ],
      footer: {
        text: message.guild.id,
      },
      timestamp: new Date(),
    };
    await message.channel.send({ embed });
  }
}
