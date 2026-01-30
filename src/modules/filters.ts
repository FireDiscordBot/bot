import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { ChannelItem } from "@fire/lib/interfaces/youtube";
import {
  ActionLogTypes,
  constants,
  LinkfilterExcluded,
  shortURLs,
} from "@fire/lib/util/constants";
import { Module } from "@fire/lib/util/module";
import * as centra from "centra";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  CategoryChannel,
  GuildChannel,
  GuildChannelResolvable,
  Invite,
  MessageEmbed,
  MessageSnapshot,
} from "discord.js";
import { LinkFilters } from "../commands/Configuration/linkfilter-toggle";

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
  private async safelyRunPromise<T extends (...args: any[]) => Promise<any>>(
    promise: T,
    ...args: Parameters<T>
  ) {
    try {
      return await promise(...args);
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
    const excluded = guild?.settings.get<LinkfilterExcluded>(
      "linkfilter.exclude",
      []
    );
    if (!excluded.length) return true;
    const roleIds = message
      ? message.member?.roles.cache.map((role) => role.id)
      : member?.roles.cache.map((role) => role.id);
    const channel =
      message instanceof ApplicationCommandMessage
        ? message.realChannel
        : message?.channel;
    if (excluded.includes(`user:${user?.id}`)) return false;
    else if (roleIds.some((id) => excluded.includes(`role:${id}`)))
      return false;
    else if (
      excluded.includes(`channel:${channel?.id}`) ||
      (channel instanceof GuildChannel &&
        !(channel instanceof CategoryChannel) &&
        excluded.includes(`channel:${channel?.parentId}`))
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
      this.console.warn(
        `Running handler(s) for filters ${enabled.join(", ")} in guild ${
          message.guild
        }`
      );
    [message, extra] = (await this.invWtfReplace(message, extra).catch(() => [
      message,
      extra,
    ])) as [FireMessage, string];
    for (const name of Object.keys(this.filters))
      if (!exclude.includes(name) && enabled.includes(name as LinkFilters)) {
        if (this.debug.includes(message.guild.id))
          this.console.warn(`Running handler(s) for ${name}`);
        this.filters[name].map(
          async (handler) =>
            await this.safelyRunPromise<typeof handler>(
              handler.bind(this),
              message,
              extra
            )
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

  async isFiltered(
    url: string,
    context?: FireMessage | ApplicationCommandMessage | FireMember | FireUser
  ) {
    if (context) {
      const check =
        context instanceof FireMessage ||
        context instanceof ApplicationCommandMessage
          ? this.shouldRun(context)
          : this.shouldRun(null, context);
      if (!check) return false;
    }
    const [replaced] = await this.invWtfReplace(url).catch(() => [url]);
    if (replaced && typeof replaced == "string") url = replaced;
    const enabled: string[] =
      !context || context instanceof FireUser
        ? []
        : context.guild?.settings.get<LinkFilters[]>("mod.linkfilter", []);
    for (const [name, regexes] of Object.entries(this.regexes)) {
      if (!enabled.includes(name)) continue;
      for (const regex of regexes) {
        if (regex.test(url)) {
          regex.lastIndex = 0;
          return true;
        }
      }
    }
    return false;
  }

  async invWtfReplace(message: FireMessage | string, extra?: string) {
    let exec: RegExpExecArray;
    const searchString =
      typeof message == "string"
        ? message
        : await this.getSearchString(message, extra);
    while ((exec = regexes.invwtf.exec(searchString)) != null) {
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
          .header("Authorization", process.env.WS_AUTH)
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

      if (data && ("invite" in data || "url" in data))
        try {
          const replacement = "invite" in data ? data.invite : data.url;

          if (message instanceof FireMessage)
            message.content = message.content.replace(exec[0], replacement);
          else message = message.replace(exec[0], replacement);
          if (extra) extra = extra.replace(exec[0], replacement);

          if (message instanceof FireMessage && message.embeds.length)
            for (const embed of message.embeds) {
              if (embed.url?.includes(exec[0]))
                embed.url = embed.url.replace(exec[0], replacement);
              if (embed.title?.includes(exec[0]))
                embed.title = embed.title.replace(exec[0], replacement);
              if (embed.description?.includes(exec[0]))
                embed.description = embed.description.replace(
                  exec[0],
                  replacement
                );
              for (const field of embed.fields) {
                if (field.name.includes(exec[0]))
                  field.name = field.name.replace(exec[0], replacement);
                if (field.value.includes(exec[0]))
                  field.value = field.value.replace(exec[0], replacement);
              }
              if (embed.author?.name?.includes(exec[0]))
                embed.author.name = embed.author.name.replace(
                  exec[0],
                  replacement
                );
              if (embed.footer?.text?.includes(exec[0]))
                embed.footer.text = embed.footer.text.replace(
                  exec[0],
                  replacement
                );
            }
        } catch {}
    }
    return [message, extra];
  }

  private async getSearchStringBasicComponents(
    message: FireMessage | MessageSnapshot
  ) {
    return [
      message.content,
      ...message.embeds.flatMap((embed) => [
        embed.title,
        embed.author?.name,
        embed.description,
        embed.footer?.text,
        embed.fields.map((field) => field.name),
        embed.fields.map((field) => field.value),
      ]),
      ...message.attachments.map((attachment) => attachment.description),
      ...(await Promise.all(
        message.attachments.map((attachment) =>
          this.safelyRunPromise<typeof this.client.util.getAttachmentPreview>(
            this.client.util.getAttachmentPreview.bind(this.client.util),
            attachment
          )
        )
      )),
      message.poll?.question.text,
      message.poll?.answers.map((answer) => answer.text),
    ]
      .flat()
      .filter(Boolean);
  }

  async getSearchString(
    message: FireMessage | MessageSnapshot,
    extra: string = ""
  ) {
    const searchString = [
      await this.getSearchStringBasicComponents(message),
      ...(await Promise.all(
        message.messageSnapshots.map((snapshot) =>
          this.safelyRunPromise<typeof this.getSearchStringBasicComponents>(
            this.getSearchStringBasicComponents.bind(this),
            snapshot
          )
        )
      )),
      extra,
    ]
      .flat()
      .filter(Boolean)
      .join(" ");

    if (searchString.includes("%"))
      try {
        return decodeURIComponent(searchString);
      } catch {}

    return searchString;
  }

  async handleInvite(message: FireMessage, extra: string = "") {
    const deleteInvite = async (inv: Invite) => {
      if (
        inv.guild.id != message.guild.id &&
        !constants.allowedInvites.includes(inv.guild.id) &&
        message.type != "AUTO_MODERATION_ACTION"
      )
        await message
          .delete({
            reason: message.guild.language.get("FILTER_MESSAGE_DELETE_REASON"),
          })
          .catch(() => {});
    };
    const deleteFail = async () =>
      await message
        .delete({
          reason: message.guild.language.get("FILTER_MESSAGE_DELETE_REASON"),
        })
        .catch(() => {});
    const noExtra = await this.getSearchString(message);
    const searchString = noExtra + " " + extra;
    let found: RegExpExecArray[] = [];
    let regexec: RegExpExecArray;
    const sanitizedSearch = this.client.util.sanitizer(
      searchString,
      searchString
    );
    for (const regex of regexes.invites)
      while ((regexec = regex.exec(sanitizedSearch))) {
        found.push(regexec);
      }
    found = found.filter(
      (exec, pos, arr) =>
        exec?.length >= 3 && arr.findIndex((m) => m[2] == exec[2]) == pos
    ); // remove non matches and duplicates
    const invites: Invite[] = [];
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
        if (message.type != "AUTO_MODERATION_ACTION") await deleteFail();
      }
      if (invite) invites.push(invite);
    }

    for (const invite of invites) {
      if (!invite) continue;

      const sameGuild = invites.filter(
        (i) => i.code != invite.code && i.guild?.id == invite.guild?.id
      );
      for (const [index] of sameGuild.entries()) invites[index] = undefined;

      if (message.guild.logIgnored.includes(message.channelId)) continue;
      const embed = new MessageEmbed()
        .setColor(message.member?.displayColor || "#FFFFFF")
        .setTimestamp()
        .setDescription(
          message.guild.language.get("FILTER_INVITE_LOG_DESCRIPTION", {
            channel:
              message.type == "AUTO_MODERATION_ACTION"
                ? message.guild.channels.cache
                    .get(
                      message.embeds[0].fields.find(
                        (f) => f.name == "channel_id"
                      ).value
                    )
                    .toString()
                : message.channel.toString(),
          })
        )
        .setAuthor({
          name: message.author.toString(),
          iconURL: message.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          }),
        })
        .setFooter({ text: message.author.id });
      if (invite.guild) {
        if (invite.guild.description?.length + embed.description.length < 4000)
          embed.setDescription(
            embed.description + `\n\n${invite.guild.description}`
          );
        embed.addFields([
          {
            name: message.guild.language.get(
              sameGuild.length
                ? "FILTER_INVITE_LOG_CODES"
                : "FILTER_INVITE_LOG_CODE"
            ),
            value: sameGuild.length
              ? [invite.code, ...sameGuild.map((i) => i.code)].join("\n")
              : invite.code,
          },
          {
            name: message.guild.language.get("GUILD"),
            value: `${invite.guild.name} (${invite.guild.id})`,
          },
          {
            name: message.guild.language.get(
              sameGuild.length ? "CHANNELS" : "CHANNEL"
            ),
            value: sameGuild.length
              ? [
                  `${invite.channel.name} (${invite.channel.id})`,
                  ...sameGuild
                    .map((i) => `${i.channel.name} (${i.channel.id})`)
                    .filter((val, index, full) => full.indexOf(val) == index),
                ].join("\n")
              : `${invite.channel.name} (${invite.channel.id})`,
          },
          {
            name: message.guild.language.get("MEMBERS"),
            value: `⬤ ${invite.presenceCount.toLocaleString(
              message.guild.language.id
            )} | ⭘ ${invite.memberCount.toLocaleString(
              message.guild.language.id
            )}`,
          },
        ]);
      } else
        embed.addFields({
          name: message.guild.language.get("FILTER_INVITE_LOG_LINK"),
          value: `discord.gg/${invite.code}`,
        });
      if (
        message.type == "AUTO_MODERATION_ACTION" &&
        message.guild.members.me
          .permissionsIn(message.channel as GuildChannelResolvable)
          .has(
            PermissionFlagsBits.SendMessages |
              PermissionFlagsBits.ReadMessageHistory
          )
      )
        await message.reply({ embeds: [embed] }).catch(() => {});
      else
        await message.guild
          .actionLog(embed, ActionLogTypes.LINKFILTER_TRIGGERED)
          .catch(() => {});
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
            await this.safelyRunPromise(
              this.handleInvite.bind(this),
              message,
              ""
            );
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
    // probably not necessary since we should always have exec but whatever
    if (exec?.groups?.code)
      if (exec.groups.code.endsWith("https"))
        exec.groups.code = exec.groups.code.slice(0, -5);
      else if (exec.groups.code.endsWith("http"))
        exec.groups.code = exec.groups.code.slice(0, -4);
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
    const searchString = await this.getSearchString(message, extra);
    const match = regexes.paypal.exec(
      this.client.util.sanitizer(searchString, searchString)
    );
    if (!match) return;
    if (message.type != "AUTO_MODERATION_ACTION")
      await message
        .delete({
          reason: message.guild.language.get("FILTER_MESSAGE_DELETE_REASON"),
        })
        .catch(() => {});
    if (message.guild.logIgnored.includes(message.channelId)) return;
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor || "#FFFFFF")
      .setTimestamp()
      .setDescription(
        message.guild.language.get("FILTER_PAYPAL_LOG_DESCRIPTION", {
          channel:
            message.type == "AUTO_MODERATION_ACTION"
              ? message.guild.channels.cache
                  .get(
                    message.embeds[0].fields.find((f) => f.name == "channel_id")
                      .value
                  )
                  .toString()
              : message.channel.toString(),
        })
      )
      .setAuthor({
        name: message.author.toString(),
        iconURL: message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setFooter({ text: message.author.id });
    if (
      message.type == "AUTO_MODERATION_ACTION" &&
      message.guild.members.me
        .permissionsIn(message.channel as GuildChannelResolvable)
        .has(
          PermissionFlagsBits.SendMessages |
            PermissionFlagsBits.ReadMessageHistory
        )
    )
      await message.reply({ embeds: [embed] }).catch(() => {});
    else
      await message.guild
        .actionLog(embed, ActionLogTypes.LINKFILTER_TRIGGERED)
        .catch(() => {});
  }

  async handleYouTubeVideo(message: FireMessage, extra: string = "") {
    const searchString = await this.getSearchString(message, extra);
    let videoMatch: RegExpExecArray;
    const ids: string[] = [];
    const sanitizedSearch = this.client.util.sanitizer(
      searchString,
      searchString
    );
    while ((videoMatch = regexes.youtube.video.exec(sanitizedSearch)) != null) {
      if (!ids.includes(videoMatch.groups.video))
        ids.push(videoMatch.groups.video);
    }
    if (ids.length && message.type != "AUTO_MODERATION_ACTION")
      await message
        .delete({
          reason: message.guild.language.get("FILTER_MESSAGE_DELETE_REASON"),
        })
        .catch(() => {});
    if (message.guild.logIgnored.includes(message.channelId)) return;
    const videos = await this.client.util.getYouTubeVideo(ids).catch(() => {});
    if (!videos || !videos.items?.length) return;
    const baseEmbed = () =>
      new MessageEmbed()
        .setColor(message.member?.displayColor || "#FFFFFF")
        .setTimestamp()
        .setDescription(
          message.guild.language.get("FILTER_YOUTUBE_LOG_DESCRIPTION", {
            channel:
              message.type == "AUTO_MODERATION_ACTION"
                ? message.guild.channels.cache
                    .get(
                      message.embeds[0].fields.find(
                        (f) => f.name == "channel_id"
                      ).value
                    )
                    .toString()
                : message.channel.toString(),
          })
        )
        .setAuthor({
          name: message.author.toString(),
          iconURL: message.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          }),
        })
        .setFooter({ text: message.author.id });
    const logEmbeds: MessageEmbed[] = [];
    for (const details of videos.items) {
      const embed = baseEmbed();
      const statistics = {
        views: parseInt(details.statistics?.viewCount || "0").toLocaleString(
          message.guild.language.id
        ),
        likes: parseInt(details.statistics?.likeCount || "0").toLocaleString(
          message.guild.language.id
        ),
        comments: parseInt(
          details.statistics?.commentCount || "0"
        ).toLocaleString(message.guild.language.id),
      };
      const description = details.snippet?.description
        ? details.snippet.description.slice(0, 100)
        : "Unknown";
      embed.addFields([
        {
          name: message.guild.language.get("TITLE"),
          value: `[${details.snippet?.title || "Unknown"}](https://youtu.be/${
            details.id
          })`,
        },
        {
          name: message.guild.language.get("CHANNEL"),
          value: `[${
            details.snippet?.channelTitle || "Unknown"
          }](https://youtube.com/channel/${
            details.snippet?.channelId || "UCuAXFkgsw1L7xaCfnd5JJOw"
          })`,
        },
        {
          name: message.guild.language.get("STATISTICS"),
          value: message.guild.language.get("FILTER_YOUTUBE_VIDEO_LOG_STATS", {
            ...statistics,
          }),
        },
        {
          name: message.guild.language.get("DESCRIPTION"),
          value:
            details.snippet?.description?.length >= 101
              ? description + "..."
              : description,
        },
      ]);
      logEmbeds.push(embed);
    }
    if (
      message.type == "AUTO_MODERATION_ACTION" &&
      message.guild.members.me
        .permissionsIn(message.channel as GuildChannelResolvable)
        .has(
          PermissionFlagsBits.SendMessages |
            PermissionFlagsBits.ReadMessageHistory
        )
    )
      if (logEmbeds.length <= 10)
        await message.reply({ embeds: logEmbeds }).catch(() => {});
      else {
        // there shouldn't be more than 20 so just these two should be fine
        await message
          .reply({
            embeds: logEmbeds.slice(0, 10),
          })
          .catch(() => {});
        await message
          .reply({
            embeds: logEmbeds.slice(10),
          })
          .catch(() => {});
      }
    // it should hopefully combine these
    else
      for (const embed of logEmbeds)
        await message.guild
          .actionLog(embed, ActionLogTypes.LINKFILTER_TRIGGERED)
          .catch(() => {});
  }

  async handleYouTubeChannel(message: FireMessage, extra: string = "") {
    const searchString = (await this.getSearchString(message, extra)).replace(
      regexes.youtube.video,
      "[ youtube video ]"
    ); // prevents videos being matched
    let channelMatch: RegExpExecArray;
    const singleChannelLinks: string[] = [];
    const channelLinks: string[] = [];
    const sanitizedSearch = this.client.util.sanitizer(
      searchString,
      searchString
    );
    while (
      (channelMatch = regexes.youtube.channel.exec(sanitizedSearch)) != null
    ) {
      const link = channelMatch.groups.channel;
      const type = link.startsWith("UC") ? channelLinks : singleChannelLinks;
      if (!type.includes(link)) type.push(link);
    }
    if (
      (channelLinks.length || singleChannelLinks.length) &&
      message.type != "AUTO_MODERATION_ACTION"
    )
      await message
        .delete({
          reason: message.guild.language.get("FILTER_MESSAGE_DELETE_REASON"),
        })
        .catch(() => {});
    if (message.guild.logIgnored.includes(message.channelId)) return;
    const channels: ChannelItem[] = [];
    const multiChannels = await this.client.util
      .getYouTubeChannels(channelLinks)
      .catch(() => {});
    if (multiChannels && multiChannels.items?.length)
      channels.push(...multiChannels.items);
    for (const link of singleChannelLinks) {
      const channel = await this.client.util
        .getYouTubeChannel(link)
        .catch(() => {});
      if (channel && channel.items?.length) channels.push(...channel.items);
    }
    if (!channels.length) return;
    const baseEmbed = () =>
      new MessageEmbed()
        .setColor(message.member?.displayColor || "#FFFFFF")
        .setTimestamp()
        .setDescription(
          message.guild.language.get("FILTER_YOUTUBE_LOG_DESCRIPTION", {
            channel:
              message.type == "AUTO_MODERATION_ACTION"
                ? message.guild.channels.cache
                    .get(
                      message.embeds[0].fields.find(
                        (f) => f.name == "channel_id"
                      ).value
                    )
                    .toString()
                : message.channel.toString(),
          })
        )
        .setAuthor({
          name: message.author.toString(),
          iconURL: message.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          }),
        })
        .setFooter({ text: message.author.id });
    const logEmbeds: MessageEmbed[] = [];
    for (const details of channels) {
      const embed = baseEmbed();
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
      embed.addFields([
        {
          name: message.guild.language.get("TITLE"),
          value: details.snippet?.title || "Unknown",
        },
        {
          name: details.snippet?.customUrl
            ? message.guild.language.get("CUSTOM_URL")
            : message.guild.language.get("CHANNEL"),
          value: details.snippet?.customUrl
            ? `https://youtube.com/${details.snippet.customUrl}`
            : `https://youtube.com/channel/${
                details.id || "UCuAXFkgsw1L7xaCfnd5JJOw"
              }`,
        },
        {
          name: message.guild.language.get("STATISTICS"),
          value: message.guild.language.get(
            "FILTER_YOUTUBE_CHANNEL_LOG_STATS",
            statistics
          ),
        },
      ]);
      logEmbeds.push(embed);
    }
    if (
      message.type == "AUTO_MODERATION_ACTION" &&
      message.guild.members.me
        .permissionsIn(message.channel as GuildChannelResolvable)
        .has(
          PermissionFlagsBits.SendMessages |
            PermissionFlagsBits.ReadMessageHistory
        )
    )
      if (logEmbeds.length <= 10)
        await message.reply({ embeds: logEmbeds }).catch(() => {});
      else {
        // there shouldn't be more than 20 so just these two should be fine
        await message
          .reply({
            embeds: logEmbeds.slice(0, 10),
          })
          .catch(() => {});
        await message
          .reply({
            embeds: logEmbeds.slice(10),
          })
          .catch(() => {});
      }
    // it should hopefully combine these
    else
      for (const embed of logEmbeds)
        await message.guild
          .actionLog(embed, ActionLogTypes.LINKFILTER_TRIGGERED)
          .catch(() => {});
  }

  async handleTwitch(message: FireMessage, extra: string = "") {
    const searchString = await this.getSearchString(message, extra);
    const clipMatch = regexes.twitch.clip.exec(
      this.client.util.sanitizer(searchString, searchString)
    );
    const channelMatch = regexes.twitch.channel.exec(
      this.client.util.sanitizer(searchString, searchString)
    );
    if (!clipMatch && !channelMatch) return;
    if (message.type != "AUTO_MODERATION_ACTION")
      await message
        .delete({
          reason: message.guild.language.get("FILTER_MESSAGE_DELETE_REASON"),
        })
        .catch(() => {});
    if (message.guild.logIgnored.includes(message.channelId)) return;
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor || "#FFFFFF")
      .setTimestamp()
      .setDescription(
        message.guild.language.get(
          clipMatch
            ? "FILTER_TWITCH_CLIP_LOG_DESCRIPTION"
            : "FILTER_TWITCH_CHANNEL_LOG_DESCRIPTION",
          { channel: message.channel.toString() }
        )
      )
      .setAuthor({
        name: message.author.toString(),
        iconURL: message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setFooter({ text: message.author.id });
    if (
      message.type == "AUTO_MODERATION_ACTION" &&
      message.guild.members.me
        .permissionsIn(message.channel as GuildChannelResolvable)
        .has(
          PermissionFlagsBits.SendMessages |
            PermissionFlagsBits.ReadMessageHistory
        )
    )
      await message.reply({ embeds: [embed] }).catch(() => {});
    else
      await message.guild
        .actionLog(embed, ActionLogTypes.LINKFILTER_TRIGGERED)
        .catch(() => {});
  }

  async handleTwitter(message: FireMessage, extra: string = "") {
    const searchString = await this.getSearchString(message, extra);
    const match = regexes.twitter.exec(
      this.client.util.sanitizer(searchString, searchString)
    );
    if (!match) return;
    if (message.type != "AUTO_MODERATION_ACTION")
      await message
        .delete({
          reason: message.guild.language.get("FILTER_MESSAGE_DELETE_REASON"),
        })
        .catch(() => {});
    if (message.guild.logIgnored.includes(message.channelId)) return;
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor || "#FFFFFF")
      .setTimestamp()
      .setDescription(
        message.guild.language.get("FILTER_TWITTER_LOG_DESCRIPTION", {
          channel:
            message.type == "AUTO_MODERATION_ACTION"
              ? message.guild.channels.cache
                  .get(
                    message.embeds[0].fields.find((f) => f.name == "channel_id")
                      .value
                  )
                  .toString()
              : message.channel.toString(),
        })
      )
      .setAuthor({
        name: message.author.toString(),
        iconURL: message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setFooter({ text: message.author.id });
    if (
      message.type == "AUTO_MODERATION_ACTION" &&
      message.guild.members.me
        .permissionsIn(message.channel as GuildChannelResolvable)
        .has(
          PermissionFlagsBits.SendMessages |
            PermissionFlagsBits.ReadMessageHistory
        )
    )
      await message.reply({ embeds: [embed] }).catch(() => {});
    else
      await message.guild
        .actionLog(embed, ActionLogTypes.LINKFILTER_TRIGGERED)
        .catch(() => {});
  }

  async handleShort(message: FireMessage, extra: string = "") {
    const searchString = await this.getSearchString(message, extra);
    const match = this.shortURLRegex.exec(
      this.client.util.sanitizer(searchString, searchString)
    );
    if (!match) return;
    if (message.type != "AUTO_MODERATION_ACTION")
      await message
        .delete({
          reason: message.guild.language.get("FILTER_MESSAGE_DELETE_REASON"),
        })
        .catch(() => {});
    if (message.guild.logIgnored.includes(message.channelId)) return;
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor || "#FFFFFF")
      .setTimestamp()
      .setDescription(
        message.guild.language.get("FILTER_SHORT_LOG_DESCRIPTION", {
          channel:
            message.type == "AUTO_MODERATION_ACTION"
              ? message.guild.channels.cache
                  .get(
                    message.embeds[0].fields.find((f) => f.name == "channel_id")
                      .value
                  )
                  .toString()
              : message.channel.toString(),
        })
      )
      .setAuthor({
        name: message.author.toString(),
        iconURL: message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setFooter({ text: message.author.id });
    if (
      message.type == "AUTO_MODERATION_ACTION" &&
      message.guild.members.me
        .permissionsIn(message.channel as GuildChannelResolvable)
        .has(
          PermissionFlagsBits.SendMessages |
            PermissionFlagsBits.ReadMessageHistory
        )
    )
      await message.reply({ embeds: [embed] }).catch(() => {});
    else
      await message.guild
        .actionLog(embed, ActionLogTypes.LINKFILTER_TRIGGERED)
        .catch(() => {});
  }
}
