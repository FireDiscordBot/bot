import { FireMessage } from "@fire/lib/extensions/message";
// import * as solutions from "../../mc_solutions.json";
import { constants } from "@fire/lib/util/constants";
import { Module } from "@fire/lib/util/module";
import { Readable } from "stream";
import * as centra from "centra";
import Filters from "./filters";
import Sk1er from "./sk1er";

const { mcLogFilters } = constants;

export default class MCLogs extends Module {
  statsTask: NodeJS.Timeout;
  regexes: {
    reupload: RegExp;
    noRaw: RegExp;
    secrets: RegExp;
    jvm: RegExp;
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
      reupload: /(?:https?:\/\/)?(paste\.ee|pastebin\.com|has?tebin\.com|hasteb\.in|hst\.sh)\/(?:raw\/|p\/)?([\w-\.]+)/gim,
      noRaw: /(justpaste\.it)\/(\w+)/gim,
      secrets: /(club.sk1er.mods.levelhead.auth.MojangAuth|api.sk1er.club\/auth|LoginPacket|SentryAPI.cpp|"authHash":|"hash":"|--accessToken|\(Session ID is token:|Logging in with details: |Server-Hash: |Checking license key :|USERNAME=.*|https:\/\/api\.hypixel\.net\/.+\?key=)/gim,
      jvm: /-Xmx\d{1,2}(?:G|M) -XX:\+UnlockExperimentalVMOptions -XX:\+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M/gim,
      ram: /-Xmx(?<ram>\d{1,2})(?<type>G|M)/gim,
      email: /[a-zA-Z0-9_.+-]{1,50}@[a-zA-Z0-9-]{1,50}\.[a-zA-Z0-9-.]{1,10}/gim,
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
      "[DefaultDispatcher-worker-1] INFO Installer",
      "[DefaultDispatcher-worker-1] ERROR Installer",
    ];
  }

  async init() {
    if (this.client.config.dev) return this.remove();
    if (
      !this.client.config.hasteLogEnabled.some((guild) =>
        (this.client.options.shards as number[]).includes(
          this.client.util.getShard(guild)
        )
      )
    )
      return this.remove();
    this.solutions = { solutions: {}, recommendations: {} };
    const solutionsReq = await centra(
      `https://api.github.com/repos/GamingGeek/BlockGameSolutions/contents/mc_solutions.json`
    )
      .header("User-Agent", "Fire Discord Bot")
      .header("Authorization", `token ${process.env.GITHUB_SOLUTIONS_TOKEN}`)
      .send();
    if (solutionsReq.statusCode == 200) {
      const solutions = await solutionsReq.json();
      this.solutions = JSON.parse(
        Buffer.from(solutions.content, "base64").toString("ascii")
      );
    }
  }

  public getSolutions(log: string) {
    let currentSolutions: string[] = [];
    let currentRecommendations: string[] = [];

    for (const [err, sol] of Object.entries(this.solutions.solutions)) {
      if (log.includes(err) && !currentSolutions.includes(`- ${sol}`))
        currentSolutions.push(`- ${sol}`);
    }
    if (log.includes("OptiFine_1.8.9_HD_U") && !log.match(/_M5(?:\.jar)?$/im))
      currentSolutions.push("- Update Optifine to the latest version, M5");

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
      if (log.includes(rec) && !currentRecommendations.includes(`- ${sol}`))
        currentRecommendations.push(`- ${sol}`);
    }

    if (currentSolutions.length > 6) currentSolutions = [];

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
    if (!this.client.config.hasteLogEnabled.includes(message.guild.id)) return;

    if (this.regexes.noRaw.test(message.content)) {
      this.regexes.noRaw.lastIndex = 0;
      try {
        await message.delete();
      } catch {}
      return await message.channel.send(
        message.language.get("SK1ER_NO_REUPLOAD", message.author.toMention()),
        {
          allowedMentions: { users: [message.author.id] },
        }
      );
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
        contentType: "text/plain; charset=utf-8",
        name: "message.txt",
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

    message.attachments
      .filter(
        (attachment) =>
          (attachment.name.endsWith(".log") ||
            attachment.name.endsWith(".txt")) &&
          attachment.size <= 8000000
      )
      .forEach(async (attach) => {
        try {
          // const text = await (await centra(attach.url).send()).text();
          let text: string[] = [];
          const stream = await centra(attach.url).stream().send();
          let logDiff: string;
          for await (const chunk of (stream as unknown) as Readable) {
            const [processed, diff] = await this.processLogStream(
              message,
              chunk.toString()
            );
            if (processed) text.push(processed);
            if (diff) logDiff = diff;
            if (text.length >= 5 && !this.hasLogText(text.join())) {
              text = [];
              break;
            }
          }
          if (text.length && this.hasLogText(text.join()))
            await this.handleLogText(message, text.join(), "uploaded", logDiff);
        } catch {
          await message.channel.send(message.language.get("MC_LOG_READ_FAIL"));
        }
      });
  }

  private async processLogStream(message: FireMessage, data: string) {
    let lines = data.split("\n");
    if (
      /ModCoreInstaller:download:\d{1,5}]: MAX: \d+/im.test(
        lines[lines.length - 1]
      )
    ) {
      try {
        const sk1erModule = this.client.getModule("sk1er") as Sk1er;
        const zip = await sk1erModule.createModcoreZip();
        if (zip) {
          try {
            await message.delete();
          } catch {}

          await message.channel.send(
            message.language.get(
              "SK1ER_MODCORE_ZIP",
              message.author.toMention(),
              zip
            ),
            {
              allowedMentions: { users: [message.author.id] },
            }
          );
          return;
        }
      } catch {}
    }

    data = data
      .replace(this.regexes.email, "[removed email]")
      .replace(this.regexes.home, "USER.HOME");

    this.regexes.url.exec(data)?.forEach((match) => {
      if (!match.includes("sk1er.club"))
        data = data.replace(match, "[removed url]");
      this.regexes.url.lastIndex = 0;
    });

    for (const line of lines) {
      if (this.regexes.secrets.test(line)) {
        this.regexes.secrets.lastIndex = 0;
        data = data.replace(line, "[line removed to protect sensitive info]");
      }
      this.regexes.secrets.lastIndex = 0;
    }

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
    try {
      const haste = await this.client.util.haste(text).catch((e: Error) => e);
      if (haste instanceof Error)
        return await message.error("MC_LOG_FAILED", haste.message);
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

      return await message.send(
        "MC_LOG_HASTE",
        message.author.toString(),
        diff,
        msgType,
        msgType == "uploaded" ? message.content : "",
        haste,
        possibleSolutions
      );
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
