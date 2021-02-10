import { SlashCommandMessage } from "../../lib/extensions/slashCommandMessage";
import { constants, shortURLs } from "../../lib/util/constants";
import { MessageEmbed, TextChannel, Invite } from "discord.js";
import { FireMember } from "../../lib/extensions/guildmember";
import { FireMessage } from "../../lib/extensions/message";
import { FireUser } from "../../lib/extensions/user";
import { Module } from "../../lib/util/module";
import * as centra from "centra";

const { regexes } = constants;

const filteredReplaceRegex = /https?:\/\/\[ filtered \]/gim;

export default class Filters extends Module {
  debug: string[];
  regexes: { [key: string]: RegExp[] };
  shortURLRegex: RegExp;
  filters: {
    [key: string]: ((message: FireMessage, extra: string) => Promise<void>)[];
  };

  constructor() {
    super("filters");
    this.debug = [];
    this.shortURLRegex = new RegExp(
      `(?:${shortURLs.join("|").replace(/\./gim, "\\.")})\/.{1,50}`,
      "gim"
    );
    this.regexes = {
      discord: regexes.invites,
      twitch: Object.values(regexes.twitch),
      youtube: Object.values(regexes.youtube),
      paypal: [regexes.paypal],
      twitter: [regexes.twitter],
      shorteners: [this.shortURLRegex],
    };
    this.filters = {
      discord: [this.handleInvite, this.handleExtInvite],
      paypal: [this.nobodyWantsToSendYouMoneyOnPayPal],
      youtube: [this.handleYouTubeVideo, this.handleYouTubeChannel],
      twitch: [this.handleTwitch],
      twitter: [this.handleTwitter],
      shorteners: [this.handleShort],
    };
  }

  // Ensures next filter doesn't get stopped by an error in the previous
  async safeExc(promise: Function, ...args: any[]) {
    try {
      await promise(...args);
    } catch {}
  }

  shouldRun(
    message?: FireMessage | SlashCommandMessage,
    userOrMember?: FireMember | FireUser
  ) {
    let user: FireUser, member: FireMember;
    if (userOrMember && userOrMember instanceof FireMember) {
      user = userOrMember.user;
      member = userOrMember;
    } else if (userOrMember && userOrMember instanceof FireUser)
      user = userOrMember;
    if ((message && message.author.bot) || (user && user.bot)) return false;
    if (!message?.guild && !member) return false;
    if (message?.member?.isModerator() || member?.isModerator()) return false;
    const excluded: string[] =
      message?.guild.settings.get("excluded.filter", []) || [];
    const roleIds = message
      ? message.member?.roles.cache.map((role) => role.id)
      : member?.roles.cache.map((role) => role.id);
    if (
      excluded.includes(message?.author?.id || user?.id) ||
      excluded.includes(message?.channel?.id) ||
      excluded.includes((message?.channel as TextChannel)?.parentID) ||
      excluded.some((id) => roleIds.includes(id))
    )
      return false;
    return true;
  }

  async runAll(
    message: FireMessage,
    extra: string = "",
    exclude: string[] = []
  ) {
    if (!this.shouldRun(message)) return;
    const enabled: string[] = message.guild.settings.get("mod.linkfilter", []);
    if (this.debug.includes(message.guild.id) && enabled.length)
      this.client.console.warn(
        `[Filters] Running handler(s) for filters ${enabled.join(
          ", "
        )} in guild ${message.guild}`
      );
    Object.keys(this.filters).forEach((name) => {
      if (!exclude.includes(name) && enabled.includes(name)) {
        if (this.debug.includes(message.guild.id))
          this.client.console.warn(`[Filters] Running handler(s) for ${name}`);
        this.filters[name].map(
          async (handler) =>
            await this.safeExc(handler.bind(this), message, extra)
        );
      }
    });
  }

  runReplace(
    text: string,
    context?: FireMessage | SlashCommandMessage | FireMember | FireUser
  ) {
    if (context) {
      const check =
        context instanceof FireMessage || context instanceof SlashCommandMessage
          ? this.shouldRun(context)
          : this.shouldRun(null, context);
      if (!check) return text;
    }
    const enabled: string[] =
      !context || context instanceof FireUser
        ? null
        : context.guild?.settings.get("mod.linkfilter", []);
    Object.entries(this.regexes).forEach(([name, regexes]) => {
      if (enabled instanceof Array && !enabled.includes(name)) return;
      regexes.forEach((regex) => {
        while (regex.test(text)) text = text.replace(regex, "[ filtered ]");
        regex.lastIndex = 0;
      });
    });
    text = text.replace(filteredReplaceRegex, "[ filtered ]");
    return text;
  }

  async handleInvite(message: FireMessage, extra: string = "") {
    const deleteInvite = async (inv: Invite) => {
      if (
        inv.guild.id != message.guild.id &&
        !constants.allowedInvites.includes(inv.guild.id)
      )
        await message
          .delete({
            reason: `Found invite for ${inv.guild} in message`,
          })
          .catch(() => {});
    };
    const deleteFail = async (e: Error) =>
      await message
        .delete({
          reason: `Failed to fetch info for invite found in message; ${e}`,
        })
        .catch(() => {});
    const searchString =
      message.content +
      " " +
      message.embeds.map((embed) => JSON.stringify(embed.toJSON())).join(" ") +
      " " +
      extra;
    const noExtra =
      message.content +
      " " +
      message.embeds.map((embed) => JSON.stringify(embed.toJSON())).join(" ");
    let found: RegExpExecArray[] = [];
    let invites: string[] = [];
    let regexec: RegExpExecArray;
    regexes.invites.forEach((regex) => {
      while ((regexec = regex.exec(searchString))) {
        found.push(regexec);
        if (regexec?.length >= 3 && !invites.includes(regexec[2]))
          invites.push(regexec[2]);
      }
    });
    found = found.filter(
      (exec, pos) => exec?.length >= 3 && invites.indexOf(exec[2]) == pos
    ); // remove non matches and duplicates
    for (const exec of found) {
      let invite: Invite;
      try {
        invite = await this.getInviteFromExec(message, exec);
        await deleteInvite(invite);
      } catch (e) {
        if (
          (e.message?.includes("actual invite") ||
            e.message?.includes("Unknown Invite")) &&
          !noExtra.includes(exec[0]) &&
          extra.includes(exec[0])
        )
          continue;
        await deleteFail(e);
      }
      if (message.guild.logIgnored.includes(message.channel.id)) continue;
      const embed = new MessageEmbed()
        .setColor(message.member?.displayHexColor || "#ffffff")
        .setTimestamp()
        .setDescription(
          message.guild.language.get(
            "FILTER_INVITE_LOG_DESCRIPTION",
            message.channel.toString()
          )
        )
        .setAuthor(
          message.author.toString(),
          message.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          })
        )
        .setFooter(message.author.id);
      if (invite) {
        embed
          .addField(
            message.guild.language.get("FILTER_INVITE_LOG_CODE"),
            invite.code,
            false
          )
          .addField(
            message.guild.language.get("GUILD"),
            `${invite.guild.name} (${invite.guild.id})`,
            false
          )
          .addField(
            message.guild.language.get("CHANNEL"),
            `${invite.channel.name} (${invite.channel.id})`,
            false
          )
          .addField(
            message.guild.language.get("MEMBERS"),
            `⬤ ${invite.presenceCount.toLocaleString(
              message.guild.language.id
            )} | ⭘ ${invite.memberCount.toLocaleString(
              message.guild.language.id
            )}`,
            false
          );
      } else
        embed.addField(
          message.guild.language.get("FILTER_INVITE_LOG_LINK"),
          exec[0],
          false
        );
      await message.guild.actionLog(embed, "linkfilter").catch(() => {});
    }
  }

  async handleExtInvite(message: FireMessage, extra: string = "") {
    for (const embed of message.embeds) {
      try {
        if (
          embed.provider.name == "Discord" &&
          embed.url &&
          [
            "https://cdn.discordapp.com/",
            "https://discord.com/assets/",
          ].some((url) => embed.thumbnail.url.includes(url))
        ) {
          const req = await centra(embed.url)
            .header("User-Agent", "Fire Discord Bot")
            .send();
          const inviteMatch = this.getInviteMatchFromReq(req);
          if (inviteMatch && inviteMatch.groups.code) {
            message.content = message.content.replace(
              embed.url,
              inviteMatch[0]
            );
            await this.safeExc(this.handleInvite.bind(this), message, "");
          }
        }
      } catch {}
    }
  }

  async getInviteFromExec(message: FireMessage, exec: RegExpExecArray) {
    if (
      ["h.inv.wtf", "i.inv.wtf"].includes(exec.groups.domain) &&
      message.author.isSuperuser()
    )
      return;
    if (message?.member.isModerator(message.channel)) return;
    let invite: Invite;
    if (
      [
        "discord.gg",
        "discord.com",
        "discordapp.com",
        "watchanimeattheoffice.com",
      ].includes(exec.groups.domain)
    ) {
      invite = await this.client.fetchInvite(exec.groups.code);
    } else if (exec.groups.domain == "inv.wtf") {
      const vanity = await (
        await centra(`https://inv.wtf/api/${exec.groups.code}`)
          .header("User-Agent", "Fire Discord Bot")
          .send()
      ).json();
      if (vanity?.invite) {
        invite = await this.client.fetchInvite(vanity.invite);
        if (!invite.guild.description && vanity.description)
          invite.guild.description = vanity.description;
      } else throw new Error("Could not find actual invite");
    } else {
      const invReq = await centra("https://" + exec[0])
        .header("User-Agent", "Fire Discord Bot")
        .send();
      const inviteMatch = this.getInviteMatchFromReq(invReq, exec);
      if (inviteMatch && inviteMatch.groups.code) {
        invite = await this.client.fetchInvite(inviteMatch.groups.code);
      } else throw new Error("Could not find actual invite");
    }
    return invite;
  }

  getInviteMatchFromReq(req: centra.Response, exec?: RegExpExecArray) {
    let inviteMatch: RegExpExecArray;
    let regexec: RegExpExecArray;
    if (regexes.discord.invite.test(req.headers.location))
      inviteMatch = regexes.discord.invite.exec(req.headers.location);
    else if (regexes.discord.invite.test(req.body.toString()))
      inviteMatch = regexes.discord.invite.exec(req.body.toString());
    else if (
      regexes.invites.some((regex) => {
        let exec: number;
        exec = regex.exec(req.body.toString())?.length;
        regex.lastIndex = 0;
        return exec;
      })
    ) {
      let found: RegExpExecArray[] = [];
      let invites: string[] = [];
      regexes.invites.forEach((regex) => {
        while ((regexec = regex.exec(req.body.toString()))) {
          found.push(regexec);
          if (regexec?.length >= 3 && !invites.includes(regexec[2]))
            invites.push(regexec[2]);
        }
      });
      found = found.filter(
        (foundExec, pos) =>
          foundExec?.length && invites.indexOf(foundExec[2]) == pos
      ); // remove non matches and duplicates
      if (found.length) inviteMatch = found[0];
    }
    return inviteMatch;
  }

  async nobodyWantsToSendYouMoneyOnPayPal(
    message: FireMessage,
    extra: string = ""
  ) {
    const searchString =
      message.content +
      " " +
      message.embeds.map((embed) => JSON.stringify(embed.toJSON())).join(" ") +
      " " +
      extra;
    const match = regexes.paypal.exec(searchString);
    if (!match) return;
    await message
      .delete({
        // I don't think this is even exposed anywhere lol
        reason: `Nobody wants to send you money on PayPal, shut up.`,
      })
      .catch(() => {});
    if (message.guild.logIgnored.includes(message.channel.id)) return;
    const embed = new MessageEmbed()
      .setColor(message.member?.displayHexColor || "#ffffff")
      .setTimestamp()
      .setDescription(
        message.guild.language.get(
          "FILTER_PAYPAL_LOG_DESCRIPTION",
          message.channel.toString()
        )
      )
      .setAuthor(
        message.author.toString(),
        message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .setFooter(message.author.id);
    await message.guild.actionLog(embed, "linkfilter").catch(() => {});
  }

  async handleYouTubeVideo(message: FireMessage, extra: string = "") {
    const searchString =
      message.content +
      " " +
      message.embeds.map((embed) => JSON.stringify(embed.toJSON())).join(" ") +
      " " +
      extra;
    const match = regexes.youtube.video.exec(searchString);
    if (!match) return;
    await message
      .delete({
        reason: `YouTube video link found in message`,
      })
      .catch(() => {});
    if (message.guild.logIgnored.includes(message.channel.id)) return;
    const video = await this.client.util
      .getYouTubeVideo(match.groups.video)
      .catch(() => {});
    const embed = new MessageEmbed()
      .setColor(message.member?.displayHexColor || "#ffffff")
      .setTimestamp()
      .setDescription(
        message.guild.language.get(
          "FILTER_YOUTUBE_LOG_DESCRIPTION",
          message.channel.toString()
        )
      )
      .setAuthor(
        message.author.toString(),
        message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .setFooter(message.author.id);
    if (video && video.items?.length) {
      const details = video.items[0];
      const statistics = {
        views: parseInt(details.statistics?.viewCount || "0").toLocaleString(
          message.guild.language.id
        ),
        likes: parseInt(details.statistics?.likeCount || "0").toLocaleString(
          message.guild.language.id
        ),
        dislikes: parseInt(
          details.statistics?.dislikeCount || "0"
        ).toLocaleString(message.guild.language.id),
        comments: parseInt(
          details.statistics?.commentCount || "0"
        ).toLocaleString(message.guild.language.id),
      };
      const description = details.snippet?.description
        ? details.snippet.description.slice(0, 100)
        : "Unknown";
      embed
        .addField(
          message.guild.language.get("TITLE"),
          `[${details.snippet?.title || "Unknown"}](https://youtu.be/${
            details.id
          })`
        )
        .addField(
          message.guild.language.get("CHANNEL"),
          `[${
            details.snippet?.channelTitle || "Unknown"
          }](https://youtube.com/channel/${
            details.snippet?.channelId || "UCuAXFkgsw1L7xaCfnd5JJOw"
          })`
        )
        .addField(
          message.guild.language.get("STATISTICS"),
          message.guild.language.get(
            "FILTER_YOUTUBE_VIDEO_LOG_STATS",
            ...Object.values(statistics)
          )
        )
        .addField(
          message.guild.language.get("DESCRIPTION"),
          details.snippet?.description?.length >= 101
            ? description + "..."
            : description
        );
      await message.guild.actionLog(embed, "linkfilter").catch(() => {});
    }
  }

  async handleYouTubeChannel(message: FireMessage, extra: string = "") {
    const searchString = (
      message.content +
      " " +
      message.embeds.map((embed) => JSON.stringify(embed.toJSON())).join(" ") +
      " " +
      extra
    ).replace(regexes.youtube.video, "[ youtube video ]"); // prevents videos being matched
    const match = regexes.youtube.channel.exec(searchString);
    if (!match) return;
    await message
      .delete({
        reason: `YouTube channel link found in message`,
      })
      .catch(() => {});
    if (message.guild.logIgnored.includes(message.channel.id)) return;
    const channel = await this.client.util
      .getYouTubeChannel(match.groups.channel)
      .catch(() => {});
    const embed = new MessageEmbed()
      .setColor(message.member?.displayHexColor || "#ffffff")
      .setTimestamp()
      .setDescription(
        message.guild.language.get(
          "FILTER_YOUTUBE_LOG_DESCRIPTION",
          message.channel.toString()
        )
      )
      .setAuthor(
        message.author.toString(),
        message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .setFooter(message.author.id);
    if (channel && channel.items?.length) {
      const details = channel.items[0];
      const statistics = {
        subs: details.statistics?.hiddenSubscriberCount
          ? "Hidden"
          : parseInt(details.statistics?.subscriberCount || "0").toLocaleString(
              message.guild.language.id
            ),
        views: parseInt(details.statistics?.viewCount || "0").toLocaleString(
          message.guild.language.id
        ),
        videos: parseInt(details.statistics?.videoCount || "0").toLocaleString(
          message.guild.language.id
        ),
      };
      embed.addField(
        message.guild.language.get("NAME"),
        details.snippet?.title || "Unknown"
      );
      if (details.snippet?.customUrl)
        embed.addField(
          message.guild.language.get("CUSTOM_URL"),
          `https://youtube.com/${details.snippet.customUrl}`
        );
      else
        embed.addField(
          message.guild.language.get("CHANNEL"),
          `https://youtube.com/channel/${
            details.id || "UCuAXFkgsw1L7xaCfnd5JJOw"
          }`
        );
      embed.addField(
        message.guild.language.get("STATISTICS"),
        message.guild.language.get(
          "FILTER_YOUTUBE_CHANNEL_LOG_STATS",
          ...Object.values(statistics)
        )
      );
    }
    await message.guild.actionLog(embed, "linkfilter").catch(() => {});
  }

  async handleTwitch(message: FireMessage, extra: string = "") {
    const searchString =
      message.content +
      " " +
      message.embeds.map((embed) => JSON.stringify(embed.toJSON())).join(" ") +
      " " +
      extra;
    const clipMatch = regexes.twitch.clip.exec(searchString);
    const channelMatch = regexes.twitch.channel.exec(searchString);
    if (!clipMatch && !channelMatch) return;
    await message
      .delete({
        reason: clipMatch
          ? `Twitch clip link found in message`
          : `Twitch channel link found in message`,
      })
      .catch(() => {});
    if (message.guild.logIgnored.includes(message.channel.id)) return;
    const embed = new MessageEmbed()
      .setColor(message.member?.displayHexColor || "#ffffff")
      .setTimestamp()
      .setDescription(
        message.guild.language.get(
          clipMatch
            ? "FILTER_TWITCH_CLIP_LOG_DESCRIPTION"
            : "FILTER_TWITCH_CHANNEL_LOG_DESCRIPTION",
          message.channel.toString()
        )
      )
      .setAuthor(
        message.author.toString(),
        message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .setFooter(message.author.id);
    await message.guild.actionLog(embed, "linkfilter").catch(() => {});
  }

  async handleTwitter(message: FireMessage, extra: string = "") {
    const searchString =
      message.content +
      " " +
      message.embeds.map((embed) => JSON.stringify(embed.toJSON())).join(" ") +
      " " +
      extra;
    const match = regexes.twitter.exec(searchString);
    if (!match) return;
    await message
      .delete({
        reason: `Twitter link found in message`,
      })
      .catch(() => {});
    if (message.guild.logIgnored.includes(message.channel.id)) return;
    const embed = new MessageEmbed()
      .setColor(message.member?.displayHexColor || "#ffffff")
      .setTimestamp()
      .setDescription(
        message.guild.language.get(
          "FILTER_TWITTER_LOG_DESCRIPTION",
          message.channel.toString()
        )
      )
      .setAuthor(
        message.author.toString(),
        message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .setFooter(message.author.id);
    await message.guild.actionLog(embed, "linkfilter").catch(() => {});
  }

  async handleShort(message: FireMessage, extra: string = "") {
    const searchString =
      message.content +
      " " +
      message.embeds.map((embed) => JSON.stringify(embed.toJSON())).join(" ") +
      " " +
      extra;
    const match = this.shortURLRegex.exec(searchString);
    if (!match) return;
    await message
      .delete({
        reason: `Shortened link found in message`,
      })
      .catch(() => {});
    if (message.guild.logIgnored.includes(message.channel.id)) return;
    const embed = new MessageEmbed()
      .setColor(message.member?.displayHexColor || "#ffffff")
      .setTimestamp()
      .setDescription(
        message.guild.language.get(
          "FILTER_SHORT_LOG_DESCRIPTION",
          message.channel.toString()
        )
      )
      .setAuthor(
        message.author.toString(),
        message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .setFooter(message.author.id);
    await message.guild.actionLog(embed, "linkfilter").catch(() => {});
  }
}
