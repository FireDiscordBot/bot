import * as sanitizer from "@aero/sanitizer";
import { FireMessage } from "@fire/lib/extensions/message";
import { constants, GuildTextChannel } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import Filters from "@fire/src/modules/filters";
import MCLogs from "@fire/src/modules/mclogs";
import { APIMessage } from "discord-api-types/v9";
import { Snowflake } from "discord-api-types/globals";
import { FireMember } from "@fire/lib/extensions/guildmember";

const { regexes } = constants;

const cleanMap = {
  ":": [/\\:/gim],
  ".": [
    /\\\./gim,
    /\(\.\)/gim,
    /dot/gim,
    /\/\./gim,
    /\[\.\]/gim,
    /\s+\./gim,
    /\.\s+/gim,
  ],
  "/": [/\.\//gim, /\\\/\//gim, /\\\//gim, /slash/gim, /\\/gim, /\s\//gim],
  "": [regexes.zws, regexes.protocol, regexes.symbol, /(\*|_|\|)/gim],
  com: [/c.m/gim],
  "discord.gg/$1": [/(^|\s)\.gg(?:\/|\\)(?<code>[\w-]{1,25})[^\/]?/gim],
  // always keep this at the end
  "/ lets be honest there is no reason to post this other than trying to send rick roll so lol, youtu.be/dQw4w9WgXcQ":
    [/\/(?:watch\?v=)?dQw4w9WgXcQ/gim],
};

const youForgotTheHyphen =
  /spider\s*?[!"#$%&'()*+,./:;<=>?@[\]^_`{|}~]*?\s*?man/gim;

const safeDecodeURI = (encodedURI: string) => {
  try {
    return decodeURI(encodedURI);
  } catch {
    return encodedURI;
  }
};

const safeDecodeURIComponent = (encodedURIComponent: string) => {
  try {
    return decodeURIComponent(encodedURIComponent);
  } catch {
    return encodedURIComponent;
  }
};

export default class Message extends Listener {
  recentTokens: string[];
  tokenRegex: RegExp;

  constructor() {
    super("message", {
      emitter: "client",
      event: "messageCreate",
    });
  }

  async exec(message: FireMessage) {
    if (this.client.manager.id != 0 && !message.guild) return;

    // temp to get rid of a fool
    if (
      message.content.toLowerCase().includes("mathouil") &&
      message.guildId == "864592657572560958" &&
      message.channel.isText() &&
      (message.channel as GuildTextChannel).parentId == "880140915119915039"
    )
      message.member // should always be true but just in case
        ? await message.member.bean(
            "Likely ban evasion in ticket",
            message.guild.members.me as FireMember,
            undefined,
            7,
            undefined,
            false
          )
        : await message.author.bean(
            message.guild,
            "Likely ban evasion in ticket",
            message.guild.members.me as FireMember,
            7
          );

    if (message.type == "CHANNEL_PINNED_MESSAGE")
      this.client.emit("channelPinsAdd", message.reference, message.member);

    if (message.hasExperiment(2779566859, 1)) {
      const theyForgot = youForgotTheHyphen.test(
        this.cleanContent(message, false)
      );
      youForgotTheHyphen.lastIndex = 0;
      if (theyForgot && message.guild?.members.me?.permissions.has(67584n))
        await message
          .reply({
            content: "You forgot the hyphen! It's Spider-Man*",
            allowedMentions: { users: [message.author.id] },
          })
          .catch(() => {});
    }

    const mcLogsModule = this.client.getModule("mclogs") as MCLogs;
    // These won't run if the modules aren't loaded
    await mcLogsModule?.checkLogs(message).catch(() => {});

    // Ensures people get dehoisted/decancered even if
    // Fire missed them joining/changing name
    if (message.member) {
      // This will check permissions & whether
      // dehoist/decancer is enabled so no need for checks here
      message.member.dehoistAndDecancer();
    }

    await message.runAntiFilters().catch(() => {});
    await message.runPhishFilters().catch(() => {});

    if (
      (message.channelId == "888494860460515388" ||
        message.channelId == "893611010227838976") &&
      message.webhookId &&
      message.embeds.length
    ) {
      const expMessage = await this.client.req
        .channels("731330454422290463")
        .messages.post<APIMessage>({
          data: {
            embed: message.embeds[0].toJSON(),
          },
        })
        .catch((e: Error) => {
          this.client.console.warn(
            `[Listener] Failed to post experiment message\n${e.stack}`
          );
        });
      if (expMessage && expMessage.id)
        await this.client.req
          .channels("731330454422290463")
          .messages(expMessage.id)
          .crosspost.post<void>()
          .catch(() => {});
    }

    if (!message.member || message.author.bot) return;

    if (
      message.guildId == this.client.config.fireguildId &&
      message.channelId == "1051050542572511274"
    )
      if (!message.member.roles.cache.has("1051050567159525407"))
        await message.member.roles.add("1051050567159525407").catch(() => {});

    const autoroleId = message.guild.settings.get<Snowflake>(
      "mod.autorole",
      null
    );
    if (autoroleId && (message.type == "DEFAULT" || message.type == "REPLY")) {
      const role = message.guild.roles.cache.get(autoroleId);
      if (role && !message.member.roles.cache.has(role.id))
        await message.member.roles
          .add(role, message.member.guild.language.get("AUTOROLE_REASON"))
          .catch(() => {});
    }

    const filters = this.client.getModule("filters") as Filters;
    await filters?.runAll(message, this.cleanContent(message)).catch(() => {});
  }

  cleanContent(message: FireMessage, includeEmbeds = true): string {
    if (message.embeds.length && includeEmbeds)
      message.embeds = message.embeds.map((embed) => {
        // normalize urls
        if (embed.url) embed.url = safeDecodeURI(new URL(embed.url).toString());
        if (embed.thumbnail?.url)
          embed.thumbnail.url = safeDecodeURI(
            new URL(embed.thumbnail.url).toString()
          );
        if (embed.author?.url)
          embed.author.url = safeDecodeURI(
            new URL(embed.author.url).toString()
          );
        return embed;
      });

    let content = message.cleanContent;

    let match: RegExpExecArray;
    while ((match = regexes.basicURL.exec(content)))
      if (match?.length)
        try {
          const uri = new URL(match[0]);
          content = content.replace(
            match[0],
            safeDecodeURIComponent(uri.toString())
          );
        } catch {}

    for (const [replacement, regexes] of Object.entries(cleanMap))
      for (const regex of regexes)
        content = content.replace(regex, replacement);

    return sanitizer(content);
  }
}
