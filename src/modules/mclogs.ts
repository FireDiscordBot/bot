import { FireMessage } from "../../lib/extensions/message";
import * as solutions from "../../mc_solutions.json";
import { Module } from "../../lib/util/module";
import * as centra from "centra";
import Filters from "./filters";
import Sk1er from "./sk1er";

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
  };
  logText: string[];

  constructor() {
    super("mclogs");
    this.regexes = {
      reupload: /(?:http(?:s)?:\/\/)?(paste\.ee|pastebin\.com|hastebin\.com|hasteb\.in|hst\.sh)\/(?:raw\/|p\/)?(\w+)/gim,
      noRaw: /(?:http(?:s)?:\/\/)?(?:justpaste).(?:it)\/(\w+)/gim,
      secrets: /(club.sk1er.mods.levelhead.auth.MojangAuth|api.sk1er.club\/auth|LoginPacket|SentryAPI.cpp|"authHash":|"hash":"|--accessToken|\(Session ID is token:|Logging in with details: |Server-Hash: |Checking license key :)/gim,
      email: /[a-zA-Z0-9_.+-]{1,50}@[a-zA-Z0-9-]{1,50}\.[a-zA-Z0-9-.]{1,10}/gim,
      url: /(?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/gim,
      home: /(\/Users\/\w+|\/home\/\w+|C:\\Users\\\w+)/gim,
      settingUser: /\[Client thread\/INFO]: Setting user: (\w{1,16})/gim,
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
      "[Client thread/INFO]:",
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
  }

  public getSolutions(log: string) {
    const currentSolutions: string[] = [];

    Object.keys(solutions).forEach((err) => {
      if (
        log.includes(err) &&
        !currentSolutions.includes(`- ${solutions[err]}`)
      )
        currentSolutions.push(`- ${solutions[err]}`);
    });

    if (log.includes("OptiFine_1.8.9_HD_U") && !log.match(/_L5|_L6|_M5/im))
      currentSolutions.push(
        "- Update Optifine to either L5 or L6 (currently available as a preview version)"
      );

    if (currentSolutions.length > 6) return "";

    return currentSolutions.length
      ? `Possible solutions:\n${currentSolutions.join("\n")}`
      : "";
  }

  async checkLogs(message: FireMessage) {
    if (message.author.bot) return; // you should see what it's like without this lol
    if (!this.client.config.hasteLogEnabled.includes(message.guild.id)) return;

    let content = message.content;

    if (this.regexes.noRaw.test(content)) {
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
    }

    const reupload = this.regexes.reupload.exec(content);
    this.regexes.reupload.lastIndex = 0;
    if (reupload != null && reupload.length >= 3) {
      const domain = reupload[1];
      const key = reupload[2];
      const rawReq = await centra(
        `https://${domain}/${domain.includes("paste.ee") ? "r" : "raw"}/${key}`
      ).send();
      if (rawReq.statusCode.toString()[0] != "2") {
        return await message.channel.send(
          message.language.get("SK1ER_REUPLOAD_FETCH_FAIL", domain)
        );
      } else {
        const text = await rawReq.text();
        content = content.replace(this.regexes.reupload, text);
      }
    }

    if (!message.attachments.size && content.length > 350)
      return await this.handleLogText(
        message,
        content,
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
          await message.channel.send(
            message.language.get("SK1ER_LOG_READ_FAIL")
          );
        }
      });
  }

  async handleLogText(message: FireMessage, text: string, msgType: string) {
    const lines = text.split("\n");
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
    });
    this.regexes.url.lastIndex = 0;

    lines.forEach((line) => {
      if (this.regexes.secrets.test(line)) {
        text = text.replace(line, "[line removed to protect sensitive info]");
        this.regexes.secrets.lastIndex = 0;
      }
    });

    const filters = this.client.getModule("filters") as Filters;
    text = filters.runReplace(text, message);

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
              const solution =
                "\n- It seems you may be using a cracked version of Minecraft. If you are, please know that we do not support piracy. Buy the game or don't play the game";
              if (possibleSolutions) possibleSolutions += solution;
              else possibleSolutions = `Possible solutions:${solution}`;
            }
          } catch {}
        }

        return await message.send(
          "SK1ER_LOG_HASTE",
          message.author.toString(),
          msgType,
          msgType == "uploaded" ? message.content : "",
          haste,
          possibleSolutions
        );
      } catch (e) {
        this.client.console.error(
          `[Sk1er] Failed to create log haste\n${e.stack}`
        );
      }
    }
  }
  createModcoreZip() {
    throw new Error("Method not implemented.");
  }

  hasLogText(text: string) {
    return this.logText.some((logText) => text.includes(logText));
  }
}
