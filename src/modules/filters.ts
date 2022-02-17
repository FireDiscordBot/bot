import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { constants, shortURLs } from "@fire/lib/util/constants";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { MessageEmbed, Snowflake, Invite } from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { Module } from "@fire/lib/util/module";
import * as sanitizer from "@aero/sanitizer";
import * as centra from "centra";
import { LinkFilters } from "../commands/Configuration/linkfilter";

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
    message?: FireMessage | ApplicationCommandMessage,
    userOrMember?: FireMember | FireUser
  ) {
    let user: FireUser, member: FireMember;
    if (userOrMember && userOrMember instanceof FireMember) {
      user = userOrMember.user;
      member = userOrMember;
    } else if (userOrMember && userOrMember instanceof FireUser)
      user = userOrMember;
    const guild = message?.guild ?? member?.guild;
    if ((message && message.author.bot) || (user && user.bot)) return false;
    if (!guild && !member) return false;
    if (!guild.settings.get<LinkFilters[]>("mod.linkfilter", []).length)
      return false;
    if (message?.member?.isModerator() || member?.isModerator()) return false;
    const excluded =
      guild?.settings.get<Snowflake[]>("excluded.filter", []) ?? [];
    const roleIds = message
      ? message.member?.roles.cache.map((role) => role.id)
      : member?.roles.cache.map((role) => role.id);
    if (
      excluded?.length &&
      (excluded.includes(message?.author?.id || user?.id) ||
        excluded.includes(message?.channel?.id) ||
        excluded.includes((message?.channel as FireTextChannel)?.parentId) ||
        excluded.some((id) => roleIds?.includes(id)))
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
    const enabled = message.guild.settings.get<LinkFilters[]>(
      "mod.linkfilter",
      []
    );
    if (this.debug.includes(message.guild.id) && enabled.length)
      this.client.console.warn(
        `[Filters] Running handler(s) for filters ${enabled.join(
          ", "
        )} in guild ${message.guild}`
      );
    [message, extra] = (await this.invWtfReplace(message, extra).catch(() => [
      message,
      extra,
    ])) as [FireMessage, string];
    for (const name of Object.keys(this.filters))
      if (!exclude.includes(name) && enabled.includes(name as LinkFilters)) {
        if (this.debug.includes(message.guild.id))
          this.client.console.warn(`[Filters] Running handler(s) for ${name}`);
        this.filters[name].map(
          async (handler) =>
            await this.safeExc(handler.bind(this), message, extra)
        );
      }
  }

  async runReplace(
    text: string,
    context?: FireMessage | ApplicationCommandMessage | FireMember | FireUser
  ) {
    if (context) {
      const check =
        context instanceof FireMessage ||
        context instanceof ApplicationCommandMessage
          ? this.shouldRun(context)
          : this.shouldRun(null, context);
      if (!check) return text;
    }
    const [replaced] = await this.invWtfReplace(text).catch(() => [text]);
    if (replaced && typeof replaced == "string") text = replaced;
    const enabled: string[] =
      !context || context instanceof FireUser
        ? []
        : context.guild?.settings.get<LinkFilters[]>("mod.linkfilter", []);
    for (const [name, regexes] of Object.entries(this.regexes)) {
      if (!enabled.includes(name)) continue;
      for (const regex of regexes) {
        while (regex.test(text)) text = text.replace(regex, "[ filtered ]");
        regex.lastIndex = 0;
      }
    }
    text = text.replace(filteredReplaceRegex, "[ filtered ]");
    return text;
  }

  async invWtfReplace(message: FireMessage | string, extra?: string) {
    let exec: RegExpExecArray;
    while (
      (exec = regexes.invwtf.exec(
        typeof message == "string"
          ? message
          : message.content +
              " " +
              message.embeds
                .map((embed) => JSON.stringify(embed.toJSON()))
                .join(" ") +
              " " +
              message.attachments
                .map((attachment) => attachment.description)
                .join(" ") +
              " " +
              extra
      )) != null
    ) {
      if (regexes.invwtf.lastIndex == exec.index) regexes.invwtf.lastIndex++;

      const code = exec.groups?.code;
      if (!code) continue; // idk how this would happen but sure

      let data: {
        invite?: string;
        url?: string;
      };

      if (
        !(message instanceof FireMessage) ||
        !message.invWtfResolved.has(code)
      ) {
        const apiReq = await centra(`https://inv.wtf/api/${code}`)
          .header("User-Agent", this.client.manager.ua)
          .header("Referer", message instanceof FireMessage ? message.url : "")
          .header("Authorization", process.env.VANITY_KEY)
          .send();
        if (apiReq.statusCode != 200) continue;
        data = (await apiReq.json().catch(() => {})) as {
          invite?: string;
          url?: string;
        };
        if (message instanceof FireMessage)
          message.invWtfResolved.set(code, {
            invite: data.invite,
            url: data.url,
          });
      } else if (message instanceof FireMessage)
        data = message.invWtfResolved.get(code);

      try {
        if (data && data.invite) {
          if (message instanceof FireMessage)
            message.content = message.content.replace(
              new RegExp(`inv.wtf\/${code}`, "gim"),
              `discord.gg/${data.invite}`
            );
          else
            message = message.replace(
              new RegExp(`inv.wtf\/${code}`, "gim"),
              `discord.gg/${data.invite}`
            );
          if (extra)
            extra = extra.replace(
              new RegExp(`inv.wtf\/${code}`, "gim"),
              `discord.gg/${data.invite}`
            );
          if (message instanceof FireMessage && message.embeds.length) {
            const index = message.embeds.findIndex((embed) =>
              embed.url.includes(`inv.wtf/${code}`)
            );
            if (index >= 0)
              message.embeds[index].url = `discord.gg/${data.invite}`;
          }
        } else if (data && data.url) {
          if (message instanceof FireMessage)
            message.content = message.content.replace(
              new RegExp(`(https?:\/\/)?inv.wtf\/${code}`, "gim"),
              data.url
            );
          else
            message = message.replace(
              new RegExp(`(https?:\/\/)?inv.wtf\/${code}`, "gim"),
              data.url
            );
          if (extra)
            extra = extra.replace(
              new RegExp(`(https?:\/\/)?inv.wtf\/${code}`, "gim"),
              data.url
            );
          if (message instanceof FireMessage && message.embeds.length) {
            const index = message.embeds.findIndex((embed) =>
              embed.url.includes(`inv.wtf/${code}`)
            );
            if (index >= 0) message.embeds[index].url = data.url;
          }
        }
      } catch {}
    }
    return [message, extra];
  }

  async handleInvite(message: FireMessage, extra: string = "") {
    const deleteInvite = async (inv: Invite) => {
      if (
        inv.guild.id != message.guild.id &&
        !constants.allowedInvites.includes(inv.guild.id)
      )
        await message.delete().catch(() => {});

      if (
        inv.guild.id == "753315331564371999" &&
        message.guild.id == "411619823445999637"
      ) {
        const member = (await message.guild.members.fetch(
          message.author.id
        )) as FireMember;
        await member.mute("No.", message.guild.me).catch(() => {});
      }
    };
    const deleteFail = async (e: Error) =>
      await message.delete().catch(() => {});
    const searchString =
      message.content +
      " " +
      message.embeds.map((embed) => JSON.stringify(embed.toJSON())).join(" ") +
      " " +
      message.attachments
        .map((attachment) => attachment.description)
        .join(" ") +
      " " +
      extra;
    const noExtra =
      message.content +
      " " +
      message.embeds.map((embed) => JSON.stringify(embed.toJSON())).join(" ") +
      " " +
      message.attachments.map((attachment) => attachment.description).join(" ");
    let found: RegExpExecArray[] = [];
    let invites: string[] = [];
    let regexec: RegExpExecArray;
    for (const regex of regexes.invites)
      while ((regexec = regex.exec(sanitizer(searchString)))) {
        found.push(regexec);
        if (regexec?.length >= 3 && !invites.includes(regexec[2]))
          invites.push(regexec[2]);
      }
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
      if (message.guild.logIgnored.includes(message.channelId)) continue;
      const embed = new MessageEmbed()
        .setColor(message.member?.displayColor ?? "#FFFFFF")
        .setTimestamp()
        .setDescription(
          message.guild.language.get("FILTER_INVITE_LOG_DESCRIPTION", {
            channel: message.channel.toString(),
          }) as string
        )
        .setAuthor({
          name: message.author.toString(),
          iconURL: message.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          }),
        })
        .setFooter(message.author.id);
      if (invite) {
        if (invite.guild.description.length + embed.description.length < 4000)
          embed.setDescription(
            embed.description + `\n\n${invite.guild.description}`
          );
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

  async handleExtInvite(message: FireMessage) {
    for (const embed of message.embeds) {
      try {
        if (
          embed.provider.name == "Discord" &&
          embed.url &&
          ["https://cdn.discordapp.com/", "https://discord.com/assets/"].some(
            (url) => embed.thumbnail.url.includes(url)
          )
        ) {
          const req = await centra(embed.url)
            .header("User-Agent", this.client.manager.ua)
            .header("Referer", message.url)
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
          .header("User-Agent", this.client.manager.ua)
          .header("Referer", message.url)
          .send()
      ).json();
      if (vanity?.invite) {
        invite = await this.client.fetchInvite(vanity.invite);
        if (!invite.guild.description && vanity.description)
          invite.guild.description = vanity.description;
      } else throw new Error("Could not find actual invite");
    } else {
      const invReq = await centra("https://" + exec[0])
        .header("User-Agent", this.client.manager.ua)
        .header("Referer", message.url)
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
      for (const regex of regexes.invites)
        while ((regexec = regex.exec(req.body.toString()))) {
          found.push(regexec);
          if (regexec?.length >= 3 && !invites.includes(regexec[2]))
            invites.push(regexec[2]);
        }
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
      message.attachments
        .map((attachment) => attachment.description)
        .join(" ") +
      " " +
      extra;
    const match = regexes.paypal.exec(sanitizer(searchString));
    if (!match) return;
    await message.delete().catch(() => {});
    if (message.guild.logIgnored.includes(message.channelId)) return;
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setTimestamp()
      .setDescription(
        message.guild.language.get("FILTER_PAYPAL_LOG_DESCRIPTION", {
          channel: message.channel.toString(),
        }) as string
      )
      .setAuthor({
        name: message.author.toString(),
        iconURL: message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setFooter(message.author.id);
    await message.guild.actionLog(embed, "linkfilter").catch(() => {});
  }

  async handleYouTubeVideo(message: FireMessage, extra: string = "") {
    const searchString =
      message.content +
      " " +
      message.embeds.map((embed) => JSON.stringify(embed.toJSON())).join(" ") +
      " " +
      message.attachments
        .map((attachment) => attachment.description)
        .join(" ") +
      " " +
      extra;
    const match = regexes.youtube.video.exec(sanitizer(searchString));
    if (!match) return;
    await message.delete().catch(() => {});
    if (message.guild.logIgnored.includes(message.channelId)) return;
    const video = await this.client.util
      .getYouTubeVideo(match.groups.video)
      .catch(() => {});
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setTimestamp()
      .setDescription(
        message.guild.language.get("FILTER_YOUTUBE_LOG_DESCRIPTION", {
          channel: message.channel.toString(),
        }) as string
      )
      .setAuthor({
        name: message.author.toString(),
        iconURL: message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
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
          message.guild.language.get("FILTER_YOUTUBE_VIDEO_LOG_STATS", {
            ...statistics,
          }) as string
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
      message.attachments
        .map((attachment) => attachment.description)
        .join(" ") +
      " " +
      extra
    ).replace(regexes.youtube.video, "[ youtube video ]"); // prevents videos being matched
    const match = regexes.youtube.channel.exec(sanitizer(searchString));
    if (!match) return;
    await message.delete().catch(() => {});
    if (message.guild.logIgnored.includes(message.channelId)) return;
    const channel = await this.client.util
      .getYouTubeChannel(match.groups.channel)
      .catch(() => {});
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setTimestamp()
      .setDescription(
        message.guild.language.get("FILTER_YOUTUBE_LOG_DESCRIPTION", {
          channel: message.channel.toString(),
        }) as string
      )
      .setAuthor({
        name: message.author.toString(),
        iconURL: message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
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
        message.guild.language.get("FILTER_YOUTUBE_CHANNEL_LOG_STATS", {
          ...statistics,
        }) as string
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
      message.attachments
        .map((attachment) => attachment.description)
        .join(" ") +
      " " +
      extra;
    const clipMatch = regexes.twitch.clip.exec(sanitizer(searchString));
    const channelMatch = regexes.twitch.channel.exec(sanitizer(searchString));
    if (!clipMatch && !channelMatch) return;
    await message.delete().catch(() => {});
    if (message.guild.logIgnored.includes(message.channelId)) return;
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setTimestamp()
      .setDescription(
        message.guild.language.get(
          clipMatch
            ? "FILTER_TWITCH_CLIP_LOG_DESCRIPTION"
            : "FILTER_TWITCH_CHANNEL_LOG_DESCRIPTION",
          { channel: message.channel.toString() }
        ) as string
      )
      .setAuthor({
        name: message.author.toString(),
        iconURL: message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setFooter(message.author.id);
    await message.guild.actionLog(embed, "linkfilter").catch(() => {});
  }

  async handleTwitter(message: FireMessage, extra: string = "") {
    const searchString =
      message.content +
      " " +
      message.embeds.map((embed) => JSON.stringify(embed.toJSON())).join(" ") +
      " " +
      message.attachments
        .map((attachment) => attachment.description)
        .join(" ") +
      " " +
      extra;
    const match = regexes.twitter.exec(sanitizer(searchString));
    if (!match) return;
    await message.delete().catch(() => {});
    if (message.guild.logIgnored.includes(message.channelId)) return;
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setTimestamp()
      .setDescription(
        message.guild.language.get("FILTER_TWITTER_LOG_DESCRIPTION", {
          channel: message.channel.toString(),
        }) as string
      )
      .setAuthor({
        name: message.author.toString(),
        iconURL: message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setFooter(message.author.id);
    await message.guild.actionLog(embed, "linkfilter").catch(() => {});
  }

  async handleShort(message: FireMessage, extra: string = "") {
    const searchString =
      message.content +
      " " +
      message.embeds.map((embed) => JSON.stringify(embed.toJSON())).join(" ") +
      " " +
      message.attachments
        .map((attachment) => attachment.description)
        .join(" ") +
      " " +
      extra;
    const match = this.shortURLRegex.exec(sanitizer(searchString));
    if (!match) return;
    await message.delete().catch(() => {});
    if (message.guild.logIgnored.includes(message.channelId)) return;
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setTimestamp()
      .setDescription(
        message.guild.language.get("FILTER_SHORT_LOG_DESCRIPTION", {
          channel: message.channel.toString(),
        }) as string
      )
      .setAuthor({
        name: message.author.toString(),
        iconURL: message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setFooter(message.author.id);
    await message.guild.actionLog(embed, "linkfilter").catch(() => {});
  }
}
