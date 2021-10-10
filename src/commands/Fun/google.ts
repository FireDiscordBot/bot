import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { Assistant, AssistantLanguage } from "nodejs-assistant";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { SnowflakeUtil, Permissions } from "discord.js";
import { Command } from "@fire/lib/util/command";
import Filters from "@fire/src/modules/filters";
import { Message } from "@fire/lib/ws/Message";

type PlaywrightResponse = {
  screenshot: { type: "Buffer"; data: number[] };
  error?: string;
};

export default class Google extends Command {
  assistant: Assistant;

  constructor() {
    super("google", {
      description: (language: Language) =>
        language.get("GOOGLE_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.ATTACH_FILES,
      ],
      restrictTo: "all",
      args: [
        {
          id: "query",
          type: "string",
          required: true,
        },
      ],
      enableSlashCommand: true,
      context: ["google it"],
      slashOnly: true,
      cooldown: 5000,
      lock: "user",
      typing: true, // This command takes a hot sec to run, especially when running locally so type while waiting
    });
    if (
      process.env.ASSISTANT_CLIENT_ID &&
      process.env.ASSISTANT_CLIENT_SECRET &&
      process.env.ASSISTANT_REFRESH_TOKEN
    )
      this.assistant = new Assistant(
        {
          type: "authorized_user",
          client_id: process.env.ASSISTANT_CLIENT_ID,
          client_secret: process.env.ASSISTANT_CLIENT_SECRET,
          refresh_token: process.env.ASSISTANT_REFRESH_TOKEN,
        },
        {
          locale: AssistantLanguage.ENGLISH, // I may add support for automatic language switching based on user/guild language later
          deviceId: "287698408855044097",
          deviceModelId: "fire0682-444871677176709141",
        }
      );
  }

  async run(command: ApplicationCommandMessage, args: { query: string }) {
    if (!this.client.manager.ws?.open)
      return await command.error("PLAYWRIGHT_ERROR_NOT_READY");
    if (!this.assistant) {
      await command.error("GOOGLE_MISSING_CREDENTIALS");
      return this.remove();
    }

    // context menu shenanigans
    if (command instanceof ContextCommandMessage)
      args.query =
        (command as ContextCommandMessage).getMessage()?.content || "Hi";

    const response = await this.assistant
      .query(args.query || "Hi", {
        audioInConfig: {
          encoding: 1,
          sampleRateHertz: 16000,
        },
        audioOutConfig: {
          encoding: 1,
          sampleRateHertz: 16000,
          volumePercentage: 0,
        },
      })
      .catch((e: Error) => e);
    if (
      response instanceof Error &&
      response.message.includes("text_query too long.")
    )
      return await command.send("GOOGLE_TOO_LONG");
    else if (response instanceof Error)
      return this.client.commandHandler.emit(
        "commandError",
        command,
        this,
        args,
        response
      );
    if (!response.html)
      return await command.react("a:okaygoogle:769207087674032129");
    const filters = this.client.getModule("filters") as Filters;
    const html = await filters.runReplace(
      response.html
        ?.replace(
          "<html>",
          `<html style="background-image: url('https://picsum.photos/1920/1080')">`
        )
        .replace(
          "Assistant.micTimeoutMs = 0;",
          `window.onload = () => {window.document.body.innerHTML = window.document.body.innerHTML
  .replace(
    /<div class=\"show_text_content\">Your name is [\\w\\n]+\\.<\\/div>/gim,
    "<div class='show_text_content'>Your name is ${command.author.username}.</div>"
  )
  .replace(
    /<div class=\"show_text_content\">I remember you telling me your name was [\\w\\n]+\\.<\\/div>/gim,
    "<div class='show_text_content'>I remember you telling me your name was ${command.author.username}.</div>"
  );};`
        ),
      command.member || command.author
    );
    if (!html)
      return await command.error("PLAYWRIGHT_ERROR_UNKNOWN").catch(() => {});
    const playwrightResponse = await this.getImageFromPlaywright(
      command,
      html
    ).catch(() => {});
    if (!playwrightResponse)
      return await command.error("PLAYWRIGHT_ERROR_UNKNOWN");
    if (playwrightResponse.error)
      return await command.error(
        `PLAYWRIGHT_ERROR_${playwrightResponse.error.toUpperCase()}` as LanguageKeys
      );
    else if (playwrightResponse.screenshot) {
      const screenshot = Buffer.from(playwrightResponse.screenshot.data);
      await command.channel
        .send({
          files: [{ attachment: screenshot, name: "playwright.png" }],
        })
        .catch(() => {});
    } else return await command.error("PLAYWRIGHT_ERROR_UNKNOWN");
  }

  async getImageFromPlaywright(
    command: ApplicationCommandMessage,
    html: string
  ): Promise<PlaywrightResponse> {
    return new Promise((resolve, reject) => {
      const nonce = SnowflakeUtil.generate();
      this.client.manager.ws.handlers.set(nonce, resolve);
      this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(EventType.PLAYWRIGHT_REQUEST, { html }, nonce)
        )
      );

      setTimeout(() => {
        // if still there, a response has not been received
        if (this.client.manager.ws.handlers.has(nonce)) {
          this.client.manager.ws.handlers.delete(nonce);
          reject();
        }
      }, 30000);
    });
  }
}
