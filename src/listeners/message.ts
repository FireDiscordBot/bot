import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Message as AetherMessage } from "@fire/lib/ws/Message";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { FireMessage } from "@fire/lib/extensions/message";
import { EventType } from "@fire/lib/ws/util/constants";
import { constants } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import Filters from "@fire/src/modules/filters";
import { APIMessage } from "discord-api-types";
import MCLogs from "@fire/src/modules/mclogs";
import { Snowflake } from "discord.js";
import * as centra from "centra";

const { regexes } = constants;
const tokenExtras = /(?:(?:  )?',(?: ')?\n?|  '|\s|\n)/gim;
const snowflakeRegex = /\d{15,21}/gim;

const cleanMap = {
  ":": [/\\:/gim],
  ".": [/\\\./gim, /\(\.\)/gim, /dot/gim, /\/\./gim],
  "/": [/\.\//gim, /\\\/\//gim, /\\\//gim, /slash/gim],
  "": [regexes.zws, regexes.protocol, regexes.symbol, /\s/gim, /(\*|_|\|)/gim],
  com: [/c.m/gim],
  "discord.gg/$1": [/(^|\s)\.gg\/(?<code>[\w-]{1,25})[^\/]?/gim],
  // always keep this at the end
  "lets be honest there is no reason to post this other than trying to send rick roll so lol, youtu.be/dQw4w9WgXcQ":
    [/\/(?:watch\?v=)?dQw4w9WgXcQ/gim],
};

export default class Message extends Listener {
  recentTokens: string[];
  tokenRegex: RegExp;

  constructor() {
    super("message", {
      emitter: "client",
      event: "messageCreate",
    });
    this.tokenRegex =
      /[a-zA-Z0-9_-]{23,28}\.[a-zA-Z0-9_-]{6,7}\.[a-zA-Z0-9_-]{27}/gm;
    this.recentTokens = [];
  }

  async tokenGist(message: FireMessage, foundIn: string) {
    let tokens: string[] = [];
    let exec: RegExpExecArray;
    while ((exec = this.tokenRegex.exec(foundIn))) {
      if (exec?.length && !this.recentTokens.includes(exec[0]))
        tokens.push(exec[0]);
    }
    this.tokenRegex.lastIndex = 0;
    for (let [index, token] of tokens.entries()) {
      const original = (" " + token).trimStart(); // creates a deep copy
      if (token.charAt(24) != ".")
        token = original.slice(0, 24) + "." + original.slice(24);
      if (token.charAt(31) != ".")
        token =
          (original.length >= 58 ? original : token).slice(0, 31) +
          "." +
          (original.length >= 58 ? original : token).slice(31);
      if (token != original) tokens[index] = token;
      const user = Buffer.from(token.split(".")[0], "base64").toString("ascii");
      if (!snowflakeRegex.test(user)) delete tokens[index];
      snowflakeRegex.lastIndex = 0;
    }
    tokens = tokens.filter((token) => !!token); // remove empty items
    if (!tokens.length) return;
    this.recentTokens.push(...tokens);
    let files: { [key: string]: { content: string } } = {};
    for (const token of tokens)
      files[`token_leak_${+new Date()}`] = {
        // the account the gists get uploaded to is hidden from the public
        // so the content doesn't matter, it just needs the token ;)
        content: `some fuckin loser leaked their token LUL anyways here it is ${token}`,
      };
    const body = {
      description: `Tokens found in ${message.guild} sent by ${message.author}`,
      public: true, // not really since account hidden but sure
      files,
    };
    try {
      const gist = await (
        await centra("https://api.github.com/gists", "POST")
          .header("User-Agent", this.client.manager.ua)
          .header("Authorization", `token ${process.env.GITHUB_TOKENS_TOKEN}`)
          .body(body, "json")
          .send()
      ).json();
      this.client.console.warn(
        `[Listener] Created gist with ${tokens.length} tokens for user${
          tokens.length > 1 ? "s" : ""
        } ${tokens
          .map((token) =>
            Buffer.from(token.split(".")[0], "base64").toString("ascii")
          )
          .join(", ")} found in ${message.guild.name} sent by ${
          message.author
        }. Waiting 10 seconds to delete gist...`
      );
      await this.client.util.sleep(10000);
      await centra(`https://api.github.com/gists/${gist.id}`, "DELETE")
        .header("User-Agent", this.client.manager.ua)
        .header("Authorization", `token ${process.env.GITHUB_TOKENS_TOKEN}`)
        .send();
    } catch (e) {
      this.client.console.error(
        `[Listener] Failed to create/delete tokens gist\n${e.stack}`
      );
    }
  }

  async exec(message: FireMessage) {
    if (this.client.manager.id != 0 && !message.guild) return;

    if (message.type == "CHANNEL_PINNED_MESSAGE")
      this.client.emit("channelPinsAdd", message.reference, message.member);

    const lowerContent = message.content.toLowerCase().replace(/\s/gim, "");
    if (
      message.guild?.hasExperiment(936071411, 1) &&
      ((lowerContent.includes("@everyone") &&
        (lowerContent.includes("nitro") ||
          lowerContent.includes("cs:go") ||
          lowerContent.includes("tradeoffer") ||
          lowerContent.includes("partner"))) ||
        (lowerContent.includes(".ru") &&
          (lowerContent.includes("tradeoffer") ||
            lowerContent.includes("partner") ||
            lowerContent.includes("cs:go"))) ||
        (lowerContent.includes("nitro") &&
          lowerContent.includes("steam") &&
          lowerContent.includes("http")) ||
        (lowerContent.includes("nitro") &&
          lowerContent.includes("distributiоn") &&
          lowerContent.includes("free")) ||
        (lowerContent.includes("discord") &&
          lowerContent.includes("steam") &&
          lowerContent.includes("http")) ||
        (lowerContent.includes("cs") &&
          lowerContent.includes("go") &&
          lowerContent.includes("skin") &&
          lowerContent.includes("http")) ||
        (lowerContent.includes("nitro") &&
          lowerContent.includes("gift") &&
          lowerContent.includes(".ru")) ||
        (lowerContent.includes("leaving") &&
          lowerContent.includes("fucking") &&
          lowerContent.includes("game")) ||
        (lowerContent.includes("airdrop") && lowerContent.includes("nitro")) ||
        (lowerContent.includes("/n@") && lowerContent.includes("nitro")))
    ) {
      if (process.env.NODE_ENV == "development")
        return await message.reply("triggered steam/nitro phishing detection");
      return await message.member?.bean(
        "Phishing links",
        message.guild.me,
        null,
        7,
        message.channel as FireTextChannel
      );
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

    let toSearch = (
      message.content +
      message.embeds.map((embed) => JSON.stringify(embed)).join(" ")
    ).replace(tokenExtras, "");
    if (this.tokenRegex.test(toSearch) && process.env.GITHUB_TOKENS_TOKEN) {
      this.tokenRegex.lastIndex = 0;
      await this.tokenGist(message, toSearch);
    }

    if (message.channel?.id == "388850472632451073" && message.embeds.length) {
      if (message.embeds[0].title.includes("new commit"))
        this.client.manager.ws.send(
          MessageUtil.encode(
            new AetherMessage(EventType.FETCH_DISCORD_EXPERIMENTS, {
              current:
                this.client.manager.state.discordExperiments?.length ?? 0,
            })
          )
        );
      const dataminingMessage = await this.client.req
        .channels("731330454422290463")
        .messages.post<APIMessage>({
          data: {
            embed: message.embeds[0].toJSON(),
          },
        })
        .catch((e: Error) => {
          this.client.console.warn(
            `[Listener] Failed to post datamining message\n${e.stack}`
          );
        });
      if (
        dataminingMessage &&
        dataminingMessage.id &&
        message.embeds[0].title.includes("comment")
      )
        await this.client.req
          .channels("731330454422290463")
          .messages(dataminingMessage.id)
          .crosspost.post<void>()
          .catch(() => {});
    }

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

    const autoroleId = message.guild.settings.get<Snowflake>(
      "mod.autorole",
      null
    );
    const delay = message.guild.settings.get<boolean>(
      "mod.autorole.waitformsg",
      false
    );
    if (autoroleId && delay && message.type == "DEFAULT") {
      const role = message.guild.roles.cache.get(autoroleId);
      if (role && !message.member.roles.cache.has(role.id))
        await message.member.roles
          .add(role, message.member.guild.language.get("AUTOROLE_REASON"))
          .catch(() => {});
    }

    const filters = this.client.getModule("filters") as Filters;
    await filters?.runAll(message, this.cleanContent(message)).catch(() => {});
  }

  cleanContent(message: FireMessage) {
    let content = message.cleanContent;
    for (const [replacement, regexes] of Object.entries(cleanMap)) {
      for (const regex of regexes)
        content = content.replace(regex, replacement);
    }
    return content;
  }
}
