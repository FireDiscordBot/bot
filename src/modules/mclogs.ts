import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
// import * as solutions from "../../mc_solutions.json";
import { FireGuild } from "@fire/lib/extensions/guild";
import { constants } from "@fire/lib/util/constants";
import { Module } from "@fire/lib/util/module";
import { Readable } from "stream";
import * as centra from "centra";
import Filters from "./filters";

const { mcLogFilters } = constants;

const allowedURLs = [
  "minecraftservices.com",
  "microsoftonline.com",
  "minecraftforge.net",
  "logging.apache.org",
  "microsoft.com",
  "xboxlive.com",
  "fabricmc.net",
  "essential.gg",
  "mojang.com",
  "sk1er.club",
  "lwjgl.org",
  "127.0.0.1",
  "live.com",
];

export default class MCLogs extends Module {
  statsTask: NodeJS.Timeout;
  regexes: {
    reupload: RegExp;
    noRaw: RegExp;
    secrets: RegExp;
    jvm: RegExp;
    optifine: RegExp;
    exOptifine: RegExp;
    forge: RegExp;
    ram: RegExp;
    email: RegExp;
    url: RegExp;
    home: RegExp;
    settingUser: RegExp;
    date: RegExp;
  };
  logText: string[];
  solutions: {
    solutions: { [key: string]: string };
    recommendations: { [key: string]: string };
  };

  constructor() {
    super("mclogs");
    this.solutions = { solutions: {}, recommendations: {} };
    this.regexes = {
      reupload:
        /(?:https?:\/\/)?(paste\.ee|pastebin\.com|has?tebin\.com|hasteb\.in|hst\.sh)\/(?:raw\/|p\/)?([\w-\.]+)/gim,
      noRaw: /(justpaste\.it)\/(\w+)/gim,
      secrets:
        /("access_key":".+"|api.sk1er.club\/auth|LoginPacket|SentryAPI.cpp|"authHash":|"hash":"|--accessToken \S+|\(Session ID is token:|Logging in with details: |Server-Hash: |Checking license key :|USERNAME=.*|https:\/\/api\.hypixel\.net\/.+(\?key=|&key=))/gim,
      jvm: /JVM Flags: (8|7) total;(?: -XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump)? -Xmx\d{1,2}(?:G|M) -XX:\+UnlockExperimentalVMOptions -XX:\+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M/gim,
      optifine: /HD_U_M(?:5|6_pre1)(?:\.jar)?(\s\d{1,3} mods loaded|$)/im,
      exOptifine: /HD_U_\w\d_MOD/gm,
      forge:
        /(?:version |MinecraftForge v|Powered by Forge |forge-?1.8.9-)11\.15\.1\.2318/gim,
      ram: /-Xmx(?<ram>\d{1,2})(?<type>G|M)/gim,
      email: /[a-zA-Z0-9_.+-]{1,50}@[a-zA-Z0-9-]{1,50}\.[a-zA-Z-.]{1,10}/gim,
      url: /(?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/gim,
      home: /(\/Users\/[\w\s]+|\/home\/\w+|C:\\Users\\[\w\s]+)/gim,
      settingUser: /\[Client thread\/INFO]: Setting user: (\w{1,16})/gim,
      date: /^time: (?<date>[\w \/\.:-]+)$/gim,
    };
    this.logText = [
      "net.minecraft.launchwrapper.Launch",
      "# A fatal error has been detected by the Java Runtime Environment:",
      "---- Minecraft Crash Report ----",
      "A detailed walkthrough of the error",
      "launchermeta.mojang.com",
      "Running launcher core",
      "Native Launcher Version:",
      "[Client thread/INFO]: Setting user:",
      "[Client thread/INFO]: (Session ID is",
      "MojangTricksIntelDriversForPerformance",
      "Loading for game Minecraft ",
      "[main/INFO]: [FabricLoader] Loading ",
      ".minecraft/libraries/net/fabricmc",
      "net.fabricmc.loader.launch",
      "net.fabricmc.loader.game",
      "net.minecraftforge",
      "gg.essential",
      "club.sk1er",
      "fabric-api",
    ];
  }

  async init() {
    await this.client.waitUntilReady();
    if (
      !this.client.guilds.cache.some((guild: FireGuild) =>
        guild.hasExperiment(77266757, 1)
      )
    )
      return this.remove();
    this.solutions = { solutions: {}, recommendations: {} };
    const solutionsReq = await centra(
      `https://api.github.com/repos/GamingGeek/BlockGameSolutions/contents/mc_solutions.json`
    )
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", `token ${process.env.GITHUB_SOLUTIONS_TOKEN}`)
      .send();
    if (solutionsReq.statusCode == 200) {
      const solutions = await solutionsReq.json().catch(() => {});
      if (solutions?.content)
        this.solutions = JSON.parse(
          Buffer.from(solutions.content, "base64").toString("ascii")
        );
    }
  }

  public getSolutions(log: string) {
    let currentSolutions: string[] = [];
    let currentRecommendations: string[] = [];

    for (const [err, sol] of Object.entries(this.solutions.solutions)) {
      if (log.includes(err) && !currentSolutions.includes(`- **${sol}**`))
        currentSolutions.push(`- **${sol}**`);
    }
    if (
      log.includes("OptiFine_1.8.9_HD_U") &&
      !log.match(this.regexes.optifine)
    )
      currentSolutions.push(
        "- **Update Optifine to one of the latest versions, M6 if on macOS, M5 if not**"
      );

    if (log.includes("11.15.1.") && !log.match(this.regexes.forge))
      currentSolutions.push("- **Update Forge to the latest version. (2318)**");

    if (log.includes("_MOD") && log.match(this.regexes.exOptifine))
      currentRecommendations.push(
        "- Don't extract Optifine, just put it in your mods folder"
      );

    const isDefault = this.regexes.jvm.test(log);
    this.regexes.jvm.lastIndex = 0;
    if (log.includes("JVM Flags: ") && !isDefault)
      currentRecommendations.push(
        "- Unless you know what you're doing, modifying your JVM args could have unintended side effects. It's best to use the defaults."
      );

    const allocatedRam = this.regexes.ram.exec(log);
    this.regexes.ram.lastIndex = 0;
    if (parseInt(allocatedRam?.groups?.ram) > 4)
      currentRecommendations.push(
        `- Most of the time you don't need more than 2GB RAM allocated (maybe 3-4GB if you use skyblock mods). You may be able to reduce the amount of RAM allocated from ${
          allocatedRam.groups.ram + allocatedRam.groups.type
        } to ${allocatedRam[0].endsWith("G") ? "2G" : "2048M"} or ${
          allocatedRam[0].endsWith("G") ? "3G" : "3072M"
        }`
      );

    for (const [rec, sol] of Object.entries(this.solutions.recommendations)) {
      if (
        log.includes(rec) &&
        !currentRecommendations.includes(`- ${sol}`) &&
        !currentSolutions.includes(`- **${sol}**`)
      )
        currentRecommendations.push(`- ${sol}`);
    }

    const solutions = currentSolutions.length
      ? `Possible Solutions:\n${currentSolutions.join("\n")}`
      : "";
    const recommendations = currentRecommendations.length
      ? `${
          currentSolutions.length ? "\n\n" : ""
        }Recommendations:\n${currentRecommendations.join("\n")}`
      : "";

    return solutions + recommendations;
  }

  async checkLogs(message: FireMessage) {
    if (message.author.bot) return; // you should see what it's like without this lol
    if (!message.guild.hasExperiment(77266757, 1)) return;

    if (this.regexes.noRaw.test(message.content)) {
      this.regexes.noRaw.lastIndex = 0;
      try {
        await message.delete();
      } catch {}
      return await message.channel.send({
        content: message.language.get("MC_LOG_NO_REUPLOAD", {
          user: message.author.toMention(),
        }) as string,
        allowedMentions: { users: [message.author.id] },
      });
    } else this.regexes.noRaw.lastIndex = 0;

    const reupload = this.regexes.reupload.exec(message.content);
    this.regexes.reupload.lastIndex = 0;
    if (reupload != null && reupload.length >= 3) {
      const domain = reupload[1];
      const key = reupload[2];
      message.content = message.content
        .replace(this.regexes.reupload, "")
        .trim();
      const url = `https://${domain}/${
        domain.includes("paste.ee") ? "r/" : "raw/"
      }${key}`;
      message.attachments.set(message.id, {
        setFile: function () {
          return this;
        },
        setName: function () {
          return this;
        },
        toJSON: () => {
          return {};
        },
        setSpoiler: function (spoiler?: boolean) {
          return this;
        },
        contentType: "text/plain; charset=utf-8",
        name: "message.txt",
        ephemeral: true,
        id: message.id,
        attachment: "",
        spoiler: false,
        proxyURL: url,
        height: 0,
        size: 0,
        width: 0,
        url,
      });
    }

    // this should always be "sent" not "sent a paste containing"
    if (!message.attachments.size && message.content.length > 350) {
      const [processed, diff] = await this.processLogStream(
        message,
        message.content
      );
      if (processed && this.hasLogText(processed))
        return await this.handleLogText(
          message,
          processed,
          reupload != null ? "sent a paste containing" : "sent",
          diff
        );
    }

    for (const [, attach] of message.attachments.filter(
      (attachment) =>
        (attachment.name.endsWith(".log") ||
          attachment.name.endsWith(".txt")) &&
        attachment.size <= 8000000
    )) {
      try {
        // const text = await (await centra(attach.url).send()).text();
        let chunks: string[] = [];
        const stream = await centra(attach.url)
          .header("User-Agent", this.client.manager.ua)
          .stream()
          .send();
        let logDiff: string;
        for await (const chunk of stream as unknown as Readable) {
          chunks.push(chunk.toString());
          if (chunks.length >= 5 && !this.hasLogText(chunks.join(""))) {
            chunks = [];
            break;
          }
        }
        chunks = chunks.reverse();
        const processed: string[] = [];
        const triggeredCleaners = [];
        while (chunks.length) {
          const text: string[] = [];
          for (
            let i = 0;
            i < 5;
            i++ // add up to 5 chunks
          ) {
            if (chunks.length) {
              const chunk = chunks.pop();
              if (
                !message.guild.hasExperiment(77266757, 2) ||
                !mcLogFilters.some((filter) => chunk.includes(filter))
              )
                text.push(chunk);
              else {
                for (const line of chunk.split("\n")) {
                  if (!mcLogFilters.some((filter) => line.includes(filter))) {
                    text.push(line);
                    continue;
                  }
                  const triggered =
                    mcLogFilters.find((filter) => line.includes(filter)) ?? "";
                  if (!triggeredCleaners.some((l) => l.includes(triggered)))
                    triggeredCleaners.push(
                      `Line: ${line.trim()}\nFilter: ${triggered}\n`
                    );
                }
              }
            }
          }
          const [data, diff] = await this.processLogStream(
            message,
            text.join("")
          );
          if (data) processed.push(data);
          if (diff) logDiff = diff;
        }

        if (triggeredCleaners.length)
          processed.push(
            ...[
              "\n\n\n",
              "This log triggered some filters to clean up spammy logs. Knowing which filters were triggered may help diagnosing the issue so here you go:\n",
              triggeredCleaners.join("\n"),
            ]
          );

        if (
          processed.length &&
          processed.some((chunk) => this.hasLogText(chunk))
        )
          await this.handleLogText(
            message,
            processed.join(""),
            "uploaded",
            logDiff
          );
      } catch {
        await message.send("MC_LOG_READ_FAIL");
      }
    }
  }

  private async processLogStream(message: FireMessage, data: string) {
    data = data
      .replace(this.regexes.email, "[removed email]")
      .replace(this.regexes.home, "USER.HOME")
      .replace(this.regexes.url, (match: string) => {
        if (allowedURLs.some((allowed) => match.includes(allowed)))
          return match;
        else return "[removed url]";
      });

    let diff: string;
    if (this.regexes.date.test(data)) {
      this.regexes.date.lastIndex = 0;
      diff = this.regexes.date.exec(data)[1];
      this.regexes.date.lastIndex = 0;
    }

    const filters = this.client.getModule("filters") as Filters;
    data = await filters.runReplace(data, message);

    data = data
      .split("\n")
      // filter imports as this often makes java code mistaken for logs
      .filter((line) => !line.startsWith("import "))
      .filter(
        (line) =>
          !mcLogFilters.some((filter) => line.trim().includes(filter.trim()))
      )
      .join("\n");

    return [data, diff];
  }

  async handleLogText(
    message: FireMessage,
    text: string,
    msgType: string,
    diff: string
  ) {
    const lines = text.split("\n");
    for (const line of lines) {
      if (this.regexes.secrets.test(line)) {
        this.regexes.secrets.lastIndex = 0;
        text = text.replace(line, "[line removed to protect sensitive info]");
      }
      this.regexes.secrets.lastIndex = 0;
    }

    text = text.replace(this.regexes.secrets, "[secrets removed]");

    try {
      const haste = await this.client.util
        .haste(text, false, "", true)
        .catch((e: Error) => e);
      if (haste instanceof Error)
        return await message.error("MC_LOG_FAILED", { error: haste.message });
      message.delete().catch(() => {});

      let possibleSolutions = this.getSolutions(text);
      const user = this.regexes.settingUser.exec(text);
      this.regexes.settingUser.lastIndex = 0;
      if (user?.length) {
        try {
          const uuid = await this.client.util.nameToUUID(user[1]);
          if (!uuid) {
            possibleSolutions =
              "It seems you may be using a cracked version of Minecraft. If you are, please know that we do not support piracy. Buy the game or don't play the game";
          }
        } catch {}
      }

      const allowedMentions = { users: [message.author.id] };
      const components = [
        new MessageActionRow().addComponents([
          new MessageButton()
            .setStyle("LINK")
            .setURL(haste.url ?? "https://google.com/something_broke_lol")
            .setLabel(message.language.get("MC_LOG_VIEW")),
          new MessageButton()
            .setStyle("LINK")
            .setURL(haste.raw ?? "https://google.com/something_broke_lol")
            .setLabel(message.language.get("MC_LOG_VIEW_RAW")),
        ]),
      ];

      const logHaste = message.guild.language.get("MC_LOG_HASTE", {
        extra: msgType == "uploaded" ? message.content : "",
        user: message.author.toMention(),
        solutions: possibleSolutions,
        msgType,
      });

      if (possibleSolutions.length <= 1850)
        return await message.channel.send({
          content: logHaste,
          allowedMentions,
          components,
        });
      else {
        if (logHaste.length <= 4096)
          return await message.channel.send({
            embeds: [new MessageEmbed().setDescription(logHaste)],
            allowedMentions,
            components,
          });
        else
          return await message.channel.send({
            content: message.guild.language.get("MC_LOG_HASTE", {
              extra: msgType == "uploaded" ? message.content : "",
              solutions: message.guild.language.get("MC_LOG_WTF"),
              user: message.author.toMention(),
              msgType,
            }),
            allowedMentions,
            components,
          });
      }
    } catch (e) {
      this.client.console.error(
        `[MCLogs] Failed to create log haste\n${e.stack}`
      );
    }
  }

  hasLogText(text: string) {
    return this.logText.some((logText) => text.includes(logText));
  }
}
