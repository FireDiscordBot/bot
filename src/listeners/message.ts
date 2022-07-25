import * as sanitizer from "@aero/sanitizer";
import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { Message as AetherMessage } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import Filters from "@fire/src/modules/filters";
import MCLogs from "@fire/src/modules/mclogs";
import * as centra from "centra";
import { APIMessage } from "discord-api-types";
import { Permissions, Snowflake, TextChannel } from "discord.js";

const { regexes, prodBotId } = constants;
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
    this.tokenRegex =
      /[a-zA-Z0-9_-]{23,28}\.[a-zA-Z0-9_-]{6,7}\.[a-zA-Z0-9_-]{27,38}/gm;
    this.recentTokens = [];
  }

  async tokenReset(message: FireMessage, foundIn: string) {
    if (message.guild && process.env.NODE_ENV != "production") {
      // check for prod bot
      const member = await message.guild.members
        .fetch(prodBotId)
        .catch(() => {});
      if (
        member &&
        member
          .permissionsIn(message.channel as TextChannel)
          .has([
            Permissions.FLAGS.VIEW_CHANNEL,
            Permissions.FLAGS.READ_MESSAGE_HISTORY,
          ])
      )
        return;
    }
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
    const file = `token_leak_${+new Date()}.txt`;
    let sha: string;
    const createFileReq = await centra(
      `https://api.github.com/repos/FireTokenScan/token-reset/contents/${file}`,
      "PUT"
    )
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", `token ${process.env.GITHUB_TOKENS_TOKEN}`)
      .body(
        {
          message: `Token${tokens.length > 1 ? "s" : ""} found in ${
            message.guild
          }, sent by ${message.author}`,
          content: Buffer.from(
            JSON.stringify(message.toJSON(), null, 2) + `\n\n${tokens}`
          ).toString("base64"),
        },
        "json"
      )
      .send();
    if (createFileReq.statusCode == 201) {
      this.client.console.warn(
        `[Listener] Uploaded file with ${tokens.length} tokens for user${
          tokens.length > 1 ? "s" : ""
        } ${tokens
          .map((token) =>
            Buffer.from(token.split(".")[0], "base64").toString("ascii")
          )
          .join(", ")}, found in message from ${message.author} in guild ${
          message.guild.name
        } as ${file}`
      );
      const body = await createFileReq.json();
      sha = body.content.sha;
    } else {
      this.client.console.error(
        `[Listener] Failed to upload file with ${
          tokens.length
        } tokens for user${tokens.length > 1 ? "s" : ""} ${tokens
          .map((token) =>
            Buffer.from(token.split(".")[0], "base64").toString("ascii")
          )
          .join(", ")}, found in message from ${message.author} in guild ${
          message.guild.name
        }`
      );
    }
    await this.client.util.sleep(10000);
    const req = await centra(
      `https://api.github.com/repos/FireTokenScan/token-reset/contents/${file}`,
      "DELETE"
    )
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", `token ${process.env.GITHUB_TOKENS_TOKEN}`)
      .body({ message: `Delete ${file}`, sha }, "json")
      .send();
    if (req.statusCode != 200)
      this.client.console.error(
        `[Listener] Failed to delete token file ${file}`
      );
  }

  async exec(message: FireMessage) {
    if (this.client.manager.id != 0 && !message.guild) return;

    if (message.type == "CHANNEL_PINNED_MESSAGE")
      this.client.emit("channelPinsAdd", message.reference, message.member);

    if (message.hasExperiment(2779566859, 1)) {
      const theyForgot = youForgotTheHyphen.test(
        this.cleanContent(message, false)
      );
      youForgotTheHyphen.lastIndex = 0;
      if (theyForgot && message.guild?.me?.permissions.has(67584n))
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

    let toSearch = (
      message.content +
      message.embeds.map((embed) => JSON.stringify(embed)).join(" ") +
      message.attachments.map((attachment) => attachment.description).join(" ")
    ).replace(tokenExtras, "");
    if (this.tokenRegex.test(toSearch) && process.env.GITHUB_TOKENS_TOKEN) {
      this.tokenRegex.lastIndex = 0;
      await this.tokenReset(message, toSearch);
    }

    if (message.channel?.id == "388850472632451073" && message.embeds.length) {
      if (message.embeds[0].title.includes("new commit"))
        this.client.manager.ws.send(
          MessageUtil.encode(
            new AetherMessage(EventType.FETCH_DISCORD_EXPERIMENTS, {
              current: this.client.manager.state.discordExperiments,
              sha: message.embeds[0].url.split("commit/")[1],
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
    while ((match = regexes.URL.exec(content)))
      if (match?.length)
        try {
          const uri = new URL(match[0]);
          content = content.replace(
            match[0],
            safeDecodeURIComponent(uri.toString())
          );
        } catch {}

    for (const [replacement, regexes] of Object.entries(cleanMap)) {
      for (const regex of regexes)
        content = content.replace(regex, replacement);
    }

    return sanitizer(content);
  }
}
