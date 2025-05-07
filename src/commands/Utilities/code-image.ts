import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { CommandInteraction } from "@fire/lib/extensions/commandinteraction";
import { ModalMessage } from "@fire/lib/extensions/modalmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import * as centra from "centra";
import {
  CommandInteractionOption,
  MessageActionRow,
  MessageAttachment,
  Modal,
  ModalActionRowComponent,
  TextInputComponent,
} from "discord.js";
import { TextInputStyles } from "discord.js/typings/enums";

const themes = {
  Bitmap: "bitmap",
  Noir: "noir",
  Ice: "ice",
  Sand: "sand",
  Forest: "forest",
  Mono: "mono",
  Breeze: "breeze",
  Candy: "candy",
  Crimson: "crimson",
  Falcon: "falcon",
  Meadow: "meadow",
  Midnight: "midnight",
  Raindrop: "raindrop",
  Sunset: "sunset",
  Rabbit: "rabbit",
  Supabase: "supabase",
  Tailwind: "tailwind",
  OpenAI: "openai",
  Mintlify: "mintlify",
  Prisma: "prisma",
  Clerk: "clerk",
} as const;
const themeIds = Object.values(themes);

const languages = {
  Bash: "shell",
  Astro: "astro",
  "C++": "cpp",
  "C#": "csharp",
  Clojure: "clojure",
  Console: "console",
  Crystal: "crystal",
  CSS: "css",
  Cypher: "cypher",
  Dart: "dart",
  Diff: "diff",
  Docker: "dockerfile",
  Elm: "elm",
  ERB: "erb",
  Elixir: "elixir",
  Erlang: "erlang",
  Gleam: "gleam",
  GraphQL: "graphql",
  Go: "go",
  HCL: "hcl",
  Haskell: "haskell",
  HTML: "html",
  Java: "java",
  JavaScript: "javascript",
  Julia: "julia",
  JSON: "json",
  JSX: "jsx",
  Kotlin: "kotlin",
  LaTeX: "latex",
  Lisp: "lisp",
  Lua: "lua",
  Markdown: "markdown",
  MATLAB: "matlab",
  Move: "move",
  Plaintext: "plaintext",
  Powershell: "powershell",
  "Objective-C": "objectivec",
  OCaml: "ocaml",
  PHP: "php",
  Prisma: "prisma",
  Python: "python",
  R: "r",
  Ruby: "ruby",
  Rust: "rust",
  Scala: "scala",
  SCSS: "scss",
  Solidity: "solidity",
  SQL: "sql",
  Swift: "swift",
  Svelte: "svelte",
  TOML: "toml",
  TypeScript: "typescript",
  TSX: "tsx",
  V: "v",
  Vue: "vue",
  XML: "xml",
  YAML: "yaml",
  Zig: "zig",
} as const;
const languageIds = Object.values(languages);

const paddingOptions = [16, 32, 64, 128] as const;

type CodeImageSchema = {
  code: string;
  theme?: (typeof themes)[keyof typeof themes];
  darkMode?: boolean;
  padding?: 16 | 32 | 64 | 128;
  language?: (typeof languages)[keyof typeof languages];
  width?: number;
  filename?: string;
};

export default class CodeImage extends Command {
  constructor() {
    super("code-image", {
      description: (language: Language) =>
        language.get("CODE_IMAGE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "source",
          type: "string",
          description: (language: Language) =>
            language.get("CODE_IMAGE_ARGUMENT_SOURCE_DESCRIPTION"),
          required: false,
        },
        {
          id: "theme",
          type: "string",
          description: (language: Language) =>
            language.get("CODE_IMAGE_ARGUMENT_THEME_DESCRIPTION"),
          required: false,
          autocomplete: true,
          default: "candy",
        },
        {
          id: "darkMode",
          slashCommandType: "dark-mode",
          type: "boolean",
          description: (language: Language) =>
            language.get("CODE_IMAGE_ARGUMENT_DARK_MODE_DESCRIPTION"),
          required: false,
          default: true,
        },
        {
          id: "padding",
          type: "number",
          slashCommandType: "padding",
          description: (language: Language) =>
            language.get("CODE_IMAGE_ARGUMENT_PADDING_DESCRIPTION"),
          choices: [
            { name: "16px", value: "16" },
            { name: "32px", value: "32" },
            { name: "64px", value: "64" },
            { name: "128px", value: "128" },
          ],
          required: false,
          default: 64,
        },
        {
          id: "language",
          type: "string",
          slashCommandType: "language",
          description: (language: Language) =>
            language.get("CODE_IMAGE_ARGUMENT_LANGUAGE_DESCRIPTION"),
          required: false,
          autocomplete: true,
        },
        {
          id: "filename",
          type: "string",
          slashCommandType: "file-name",
          description: (language: Language) =>
            language.get("CODE_IMAGE_ARGUMENT_FILENAME_DESCRIPTION"),
          required: false,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true, // we need this so we don't acknowledge the slash command
    });
  }

  async autocomplete(
    _: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ) {
    if (focused.name == "theme")
      return Object.entries(themes)
        .map((theme) => ({
          name: theme[0],
          value: theme[1],
        }))
        .filter((theme) =>
          focused.value
            ? theme.name
                .toLowerCase()
                .includes((focused.value as string).toLowerCase())
            : true
        )
        .slice(0, 25);
    else if (focused.name == "language")
      return Object.entries(languages)
        .map((lang) => ({
          name: lang[0],
          value: lang[1],
        }))
        .filter((lang) =>
          focused.value
            ? lang.name
                .toLowerCase()
                .includes((focused.value as string).toLowerCase())
            : true
        )
        .slice(0, 25);
    return [];
  }

  async run(
    command: ApplicationCommandMessage,
    args: {
      source?: string;
      theme: CodeImageSchema["theme"];
      darkMode: CodeImageSchema["darkMode"];
      padding: CodeImageSchema["padding"];
      language: CodeImageSchema["language"];
      filename: CodeImageSchema["filename"];
    }
  ) {
    if (
      !this.client.manager.REST_HOST ||
      !process.env.WS_AUTH ||
      !this.client.manager.ws?.open
    )
      return await command.error("CODE_IMAGE_NOT_READY");

    const data = {
      code: "",
      theme: args.theme,
      darkMode: args.darkMode,
      padding: args.padding,
      language: args.language,
      filename: args.filename,
    };

    if (data.theme && !themeIds.includes(data.theme))
      return await command.error("CODE_IMAGE_INVALID_THEME");
    if (data.language && !languageIds.includes(data.language))
      return await command.error("CODE_IMAGE_INVALID_LANGUAGE");
    if (data.padding && !paddingOptions.includes(data.padding))
      return await command.error("CODE_IMAGE_INVALID_PADDING");

    let respond: ApplicationCommandMessage | ModalMessage = command;
    let code: string = "";
    if (args.source) {
      try {
        const source = new URL(args.source);
        const valid = this.client.util.getRawPasteURL(source);
        if (!valid) return await respond.error("CODE_IMAGE_INVALID_SOURCE");
        if (!data.filename)
          // won't always be an actual filename but it's nice to have
          data.filename = source.pathname.split("/").pop() || undefined;
        const content = await this.client.util
          .getPasteContent(source, true)
          .catch(() => {});
        if (!content) return await respond.error("CODE_IMAGE_FAILED_TO_FETCH");
        let lines = 0;
        for await (const chunk of content) {
          const chunkString = chunk.toString();
          // count newlines in chunk
          lines += chunkString.split("\n").length - 1;
          if (lines > 100 && !respond.author.isSuperuser())
            return await respond.error("CODE_IMAGE_TOO_MANY_LINES");
          code += chunkString;
        }
      } catch {
        return await respond.error("CODE_IMAGE_FAILED_TO_FETCH");
      }
    } else {
      const modalPromise = this.waitForModal(command);
      await (respond.slashCommand as CommandInteraction).showModal(
        new Modal()
          .setTitle(respond.language.get("CODE_IMAGE_MODAL_TITLE"))
          .setCustomId(`ray.so:${respond.author.id}`)
          .addComponents(
            new MessageActionRow<ModalActionRowComponent>().addComponents(
              new TextInputComponent()
                .setCustomId("code")
                .setRequired(true)
                .setLabel(respond.language.get("CODE_IMAGE_MODAL_FIELD_NAME"))
                .setPlaceholder(
                  respond.language.get("CODE_IMAGE_MODAL_FIELD_PLACEHOLDER")
                )
                .setStyle(TextInputStyles.PARAGRAPH)
            )
          )
      );

      const modal = await modalPromise;
      await modal.channel.ack();
      respond = modal;
      modal.flags = 64;

      code = modal.getTextInputValue("code");
      if (!code?.length)
        return await modal.error("COMMAND_ERROR_GENERIC", { id: "code-image" });
    }

    await respond.send("CODE_IMAGE_PROCESSING");
    data.code = Buffer.from(code, "utf-8").toString("base64");

    const image = await centra(
      `${this.client.manager.REST_HOST}/v2/img/code`,
      "POST"
    )
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", process.env.WS_AUTH)
      .body(data, "json")
      .send()
      .catch(() => {});

    if (!image || image.statusCode != 200) {
      if (!image || !respond.author.isSuperuser())
        return await respond.error("CODE_IMAGE_FAILED");
      const response = await this.client.util.haste(
        image.body.toString(),
        true
      );
      return await respond.error("CODE_IMAGE_FAILED_SUPERUSER", {
        status: image.statusCode,
        body: response,
      });
    } else {
      await respond.edit({
        content: respond.language.get("CODE_IMAGE_UPLOADING"),
      });
      if (!respond.author.settings.get<boolean>("utils.incognito", false))
        respond.flags = 0;
      const attach = new MessageAttachment(image.body, "code.png");
      return await respond.channel.send({ files: [attach] });
    }
  }

  waitForModal(command: ApplicationCommandMessage): Promise<ModalMessage> {
    return new Promise((resolve) => {
      this.client.modalHandlersOnce.set(`ray.so:${command.author.id}`, resolve);
    });
  }
}
