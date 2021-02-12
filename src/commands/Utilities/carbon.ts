import { FireMessage } from "@fire/lib/extensions/message";
import { Codeblock } from "@fire/src/arguments/codeblock";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { MessageAttachment } from "discord.js";
import * as fuzz from "fuzzball";
import * as centra from "centra";
import { Argument } from "discord-akairo";

const validThemes = [
  "3024-night",
  "a11y-dark",
  "blackboard",
  "base16-dark",
  "base16-light",
  "cobalt",
  "dracula",
  "duotone-dark",
  "hopscotch",
  "lucario",
  "material",
  "monokai",
  "night-owl",
  "nord",
  "oceanic-next",
  "one-light",
  "one-dark",
  "panda-syntax",
  "paraiso-dark",
  "seti",
  "shades-of-purple",
  "solarized dark",
  "solarized light",
  "synthwave-84",
  "twilight",
  "verminal",
  "vscode",
  "yeti",
  "zenburn",
];
const validFonts = [
  "Anonymous Pro",
  "Droid Sans Mono",
  "Fantasque Sans Mono",
  "Fira Code",
  "Hack",
  "IBM Plex Mono",
  "Inconsolata",
  "Iosevka",
  "JetBrains Mono",
  "Monoid",
  "Source Code Pro",
  "Space Mono",
  "Ubuntu Mono",
];
const languageMapping = {
  objectivec: "text/x-objectivec",
  bash: "application/x-sh",
  json: "application/json",
  apache: "text/apache",
  cpp: "text/x-c++src",
  kt: "text/x-kotlin",
  cs: "text/x-csharp",
  diff: "text/x-diff",
  java: "text/x-java",
  sql: "text/x-mysql",
  php: "text/x-php",
  js: "javascript",
  ts: "typescript",
  xml: "htmlmixed",
  go: "text/x-go",
  py: "python",
  ini: "toml",
};

export default class Carbon extends Command {
  constructor() {
    super("carbon", {
      description: (language: Language) =>
        language.get("CARBON_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "code",
          match: "rest",
          type: "codeblock",
          readableType: "code|listthemes|listfonts",
          default: null,
          required: true,
        },
        {
          id: "theme",
          type: "string",
          required: false,
          match: "option",
          flag: "--theme",
          default: null,
        },
        {
          id: "font",
          type: "string",
          required: false,
          match: "option",
          flag: "--font",
          default: null,
        },
      ],
      restrictTo: "all",
      typing: true,
      lock: "user",
    });
  }

  async exec(
    message: FireMessage,
    args: {
      code: Codeblock;
      theme: string;
      font: string;
    }
  ) {
    if (
      !(process.env.REST_HOST || process.env.REST_PORT) ||
      !process.env.WS_AUTH ||
      !this.client.manager.ws?.open
    )
      return await message.error("CARBON_NOT_READY");

    if (!args.code.content) return await message.error("CARBON_CODE_REQUIRED");
    if (args.code.content == "listthemes")
      return await message.channel.send(validThemes.join(", "));
    else if (args.code.content == "listfonts")
      return await message.channel.send(validFonts.join(", "));
    const language = languageMapping[args.code.language] || "auto";
    let theme = "one-dark";
    let font = "JetBrains Mono";
    if (args.theme)
      theme = validThemes.find(
        (theme) =>
          fuzz.ratio(
            theme.trim().toLowerCase(),
            args.theme.trim().toLowerCase()
          ) >= 85
      );
    if (args.font)
      font = validFonts.find(
        (font) =>
          fuzz.ratio(
            font.trim().toLowerCase(),
            args.font.trim().toLowerCase()
          ) >= 85
      );

    const body = {
      code: args.code.content,
      windowControls: false,
      fontFamily: font,
      language,
      theme,
    };

    const image = await centra(
      process.env.NODE_ENV == "development"
        ? `http://localhost:${process.env.REST_PORT}/img/carbon`
        : `https://${process.env.REST_HOST}/img/carbon`,
      "POST"
    )
      .header("User-Agent", "Fire Discord Bot")
      .header("Authorization", process.env.WS_AUTH)
      .body(body, "json")
      .send()
      .catch(() => {});

    if (!image || image.statusCode != 200)
      return await message.error("CARBON_IMAGE_FAILED");
    else {
      const attach = new MessageAttachment(image.body, "code.png");
      return await message.channel.send(attach);
    }
  }
}
