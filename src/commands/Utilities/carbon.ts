import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { CommandInteractionOption, MessageAttachment } from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
import { Codeblock } from "@fire/src/arguments/codeblock";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import * as fuzz from "fuzzball";
import * as centra from "centra";

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

const getFuzzy = (items: string[], name: string) => {
  let ratio = 90;
  let fuzzy: string[] = [];
  while (!fuzzy.length && ratio >= 60) {
    fuzzy = items.filter(
      (item) =>
        fuzz.ratio(name.trim().toLowerCase(), item.trim().toLowerCase()) >=
        ratio--
    );
  }
  if (!fuzzy.length) fuzzy = items.filter((item) => item.startsWith(name));
  return fuzzy;
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
          slashCommandType: "code",
          default: null,
          required: true,
        },
        {
          id: "theme",
          type: "string",
          required: false,
          autocomplete: true,
          match: "option",
          flag: "--theme",
          default: null,
        },
        {
          id: "font",
          type: "string",
          required: false,
          autocomplete: true,
          match: "option",
          flag: "--font",
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      typing: true,
      lock: "user",
    });
  }

  async autocomplete(
    _: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ) {
    if (focused.name == "theme") {
      if (!focused.value) return validThemes;
      else return getFuzzy(validThemes, focused.value.toString());
    } else if (focused.name == "font") {
      if (!focused.value) return validFonts;
      else return getFuzzy(validFonts, focused.value.toString());
    }
    return [];
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
      return await message.channel.send({ content: validThemes.join(", ") });
    else if (args.code.content == "listfonts")
      return await message.channel.send({ content: validFonts.join(", ") });
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
      process.env.REST_HOST
        ? `https://${process.env.REST_HOST}/img/carbon`
        : `http://localhost:${process.env.REST_PORT}/img/carbon`,
      "POST"
    )
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", process.env.WS_AUTH)
      .body(body, "json")
      .send()
      .catch(() => {});

    if (!image || image.statusCode != 200)
      return await message.error("CARBON_IMAGE_FAILED");
    else {
      const attach = new MessageAttachment(image.body, "code.png");
      return await message.channel.send({ files: [attach] });
    }
  }
}
