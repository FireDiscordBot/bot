import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { validPasteURLs } from "@fire/lib/util/clientutil";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import MCLogs, { MCLogsResponse } from "@fire/src/modules/mclogs";
import * as centra from "centra";
import { MessageAttachment } from "discord.js";

export default class CheckLog extends Command {
  module: MCLogs;

  constructor() {
    super("minecraft-check-log", {
      description: (language: Language) =>
        language.get("MINECRAFT_CHECK_LOG_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "paste",
          type: "string",
          description: (language: Language) =>
            language.get("MINECRAFT_CHECK_LOG_ARGUMENT_PASTE_DESCRIPTION"),
          default: null,
          required: false,
        },
        {
          id: "file",
          slashCommandType: "file",
          type: "attachment",
          description: (language: Language) =>
            language.get("MINECRAFT_CHECK_LOG_ARGUMENT_FILE_DESCRIPTION"),
          default: null,
          required: false,
        },
      ],
      parent: "minecraft",
      deferAnyways: true,
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
      premium: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { paste?: string; file?: MessageAttachment }
  ) {
    if (!args.paste && !args.file)
      return await command.error("MINECRAFT_CHECK_LOG_MISSING_ARGUMENT", {
        valid: validPasteURLs.map((url) => `\`${url}\``).join(", "),
      });

    let url: string;
    if (args.paste) {
      const raw = this.client.util.getRawPasteURL(args.paste);
      if (!raw)
        return await command.error("MINECRAFT_CHECK_LOG_INVALID_PASTE", {
          valid: validPasteURLs.map((url) => `\`${url}\``).join(", "),
        });
      url = raw.toString();
    } else url = args.file.url;

    if (!this.module) {
      this.module = this.client.getModule("mclogs") as MCLogs;
      if (!this.module)
        return await command.error("MINECRAFT_CHECK_LOG_MODULE_NOT_FOUND");
    }

    const mclogsReq = await centra(`${constants.url.mclogs}/scan`, "post")
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", `Bearer ${process.env.MCLOGS_API_KEY}`)
      .body(
        {
          url,
          paste: true,
          config: {
            mobile: command.guild?.settings.get(
              "minecraft.logscan.mobile",
              false
            ),
            clients: command.guild?.settings.get(
              "minecraft.logscan.clients",
              false
            ),
            cheats: command.guild?.settings.get(
              "minecraft.logscan.cheats",
              false
            ),
            allowFeather: command.guild?.settings.get(
              "minecraft.logscan.allowfeather",
              false
            ),
            cracked: command.guild?.settings.get(
              "minecraft.logscan.cracked",
              false
            ),
            filters: {
              sensitive: false,
              email: false,
              name: false,
              ip: false,
            },
          },
        },
        "json"
      )
      .send();
    if (mclogsReq.statusCode == 204)
      return await command.error("MINECRAFT_CHECK_LOG_INVALID_CONTENT");
    const mclogsRes = (await mclogsReq
      .json()
      .catch(() => ({ error: "Failed to parse body" }))) as MCLogsResponse;
    if ("error" in mclogsRes) {
      return await command.error("MINECRAFT_CHECK_LOG_FAILED", {
        error: mclogsRes.error,
      });
    } else if ("logType" in mclogsRes) {
      return await this.module.handleLogRes(
        command,
        command.language,
        [{ match: url, rawURL: new URL(url) }],
        url,
        new URL(url),
        mclogsRes
      );
    }
  }
}
