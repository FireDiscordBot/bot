import { FireMessage } from "@fire/lib/extensions/message";
// import * as solutions from "../../mc_solutions.json";
import { constants } from "@fire/lib/util/constants";
import { Module } from "@fire/lib/util/module";
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
        await message.delete({
          reason: "Unable to reupload log from source to hastebin",
        });
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
    if (!message.attachments.size && message.content.length > 350)
      return await this.handleLogText(
        message,
        message.content,
        reupload != null ? "sent a paste containing" : "sent"
      );

    message.attachments
      .filter(
        (attachment) =>
          attachment.name.endsWith(".log") || attachment.name.endsWith(".txt")
      )
      .forEach(async (attach) => {
        try {
          const text = await (await centra(attach.url).send()).text();
          await this.handleLogText(message, text, "uploaded");
        } catch {
          await message.channel.send(message.language.get("MC_LOG_READ_FAIL"));
        }
      });

    if (
      message.attachments.filter((attachment) =>
        attachment.name.endsWith(".log.gz")
      ).size &&
      !message.attachments.filter(
        (attachment) =>
          attachment.name.endsWith(".log") || attachment.name.endsWith(".txt")
      ).size
    )
      await message.channel.send(
        "https://cdn.discordapp.com/attachments/411620457754787841/785635918962098216/unknown-19.png"
      );
  }

  async handleLogText(message: FireMessage, text: string, msgType: string) {
    let lines = text.split("\n");
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
            await message.delete({
              reason: "Removing log and sending Modcore zip",
            });
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
        }
      } catch {}
    }

    text = text
      .replace(this.regexes.email, "[removed email]")
      .replace(this.regexes.home, "USER.HOME");

    this.regexes.url.exec(text)?.forEach((match) => {
      if (!match.includes("sk1er.club"))
        text = text.replace(match, "[removed url]");
      this.regexes.url.lastIndex = 0;
    });

    for (const line of lines) {
      if (this.regexes.secrets.test(line)) {
        this.regexes.secrets.lastIndex = 0;
        text = text.replace(line, "[line removed to protect sensitive info]");
      }
      this.regexes.secrets.lastIndex = 0;
    }

    let diff: string;
    if (this.regexes.date.test(text)) {
      this.regexes.date.lastIndex = 0;
      diff = this.regexes.date.exec(text)[1];
      this.regexes.date.lastIndex = 0;
    }

    const filters = this.client.getModule("filters") as Filters;
    text = filters.runReplace(text, message);

    text = text
      .split("\n")
      .filter(
        (line) =>
          !mcLogFilters.some((filter) => line.trim().includes(filter.trim()))
      )
      .join("\n");

    if (this.hasLogText(text)) {
      try {
        const haste = await this.client.util.haste(text);
        try {
          await message.delete({
            reason: "Removing log and sending haste",
          });
        } catch {}

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
  }

  hasLogText(text: string) {
    return this.logText.some((logText) => text.includes(logText));
  }
}
