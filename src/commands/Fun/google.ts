import * as credentials from "../../../assistant-credentials.json";
import { Assistant, AssistantLanguage } from "nodejs-assistant";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import Filters from "../../modules/filters";
import { chromium } from "playwright";

export default class Google extends Command {
  assistant: Assistant;

  constructor() {
    super("google", {
      description: (language: Language) =>
        language.get("GOOGLE_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "ATTACH_FILES"],
      restrictTo: "all",
      args: [
        {
          id: "query",
          type: "string",
          default: "Hi",
          required: true, // Default is set to Hi so that the assistant will likely ask what it can do
        },
      ],
      lock: "user",
      typing: true, // This command takes a hot sec to run, especially when running locally so type while waiting
    });
    this.assistant = new Assistant(
      {
        type: "authorized_user",
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        refresh_token: credentials.refresh_token,
      },
      {
        locale: AssistantLanguage.ENGLISH, // I may add support for automatic language switching based on user/guild language later
        deviceId: "287698408855044097",
        deviceModelId: "fire0682-444871677176709141",
      }
    );
  }

  async exec(message: FireMessage, args: { query: string }) {
    const response = await this.assistant
      .query(args.query, {
        conversationState:
          this.client.conversationStates.get(message.author.id) || null,
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
      return await message.error("GOOGLE_TOO_LONG");
    else if (response instanceof Error) return await message.error();
    this.client.conversationStates.set(
      message.author.id,
      response.conversationState
    );
    const filters = this.client.getModule("filters") as Filters;
    const html = response.html
      ?.replace(
        "<html>",
        `<html style="background-image: url('https://picsum.photos/1920/1080')">`
      )
      .replace(
        "Assistant.micTimeoutMs = 0;",
        `window.onload = () => {window.document.body.innerHTML = window.document.body.innerHTML
  .replace(
    /<div class=\"show_text_content\">Your name is \\w+\\.<\\/div>/gim,
    "<div class='show_text_content'>Your name is ${message.author.username}.</div>"
  )
  .replace(
    /<div class=\"show_text_content\">I remember you telling me your name was \\w+\\.<\\/div>/gim,
    "<div class='show_text_content'>I remember you telling me your name was ${message.author.username}.</div>"
  );};`
      );
    if (!html)
      return await message.replyRaw(
        message.language.get("GOOGLE_SOMETHING_WENT_WRONG") as string
      );
    const browser = await chromium.launch({
      logger: null,
      args: ["--headless", "--disable-gpu", "--log-file=/dev/null"],
    });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();
    await page.setContent(filters.runReplace(html), {
      waitUntil: "load",
    });
    await this.client.util.sleep(250);
    const screenshot = await page.screenshot({ type: "png", fullPage: true });
    await page.close();
    await context.close();
    await browser.close();
    await message.channel.send(null, {
      files: [{ attachment: screenshot, name: "google.png" }],
    });
  }
}
