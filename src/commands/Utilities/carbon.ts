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
import * as fuzz from "fuzzball";
import * as prettier from "prettier";

const validThemes = [
  "3024-night",
  "a11y-dark",
  "blackboard",
  "base16-dark",
  "base16-light",
  "cobalt",
  "dracula-pro",
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
  "Cascadia Code",
  "Droid Sans Mono",
  "Fantasque Sans Mono",
  "Fira Code",
  "Hack",
  "IBM Plex Mono",
  "Inconsolata",
  "JetBrains Mono",
  "Monoid",
  "Source Code Pro",
  "Space Mono",
  "Ubuntu Mono",
];

const getFuzzy = (items: string[], name: string) => {
  let ratio = 90;
  let fuzzy: string[] = [];
  while (!fuzzy.length && ratio >= 40) {
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
          id: "theme",
          type: "string",
          description: (language: Language) =>
            language.get("CARBON_ARGUMENT_THEME_DESCRIPTION"),
          required: false,
          autocomplete: true,
          default: null,
        },
        {
          id: "font",
          type: "string",
          description: (language: Language) =>
            language.get("CARBON_ARGUMENT_FONT_DESCRIPTION"),
          required: false,
          autocomplete: true,
          default: null,
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
    if (focused.name == "theme") {
      if (!focused.value) return validThemes;
      else return getFuzzy(validThemes, focused.value.toString());
    } else if (focused.name == "font") {
      if (!focused.value) return validFonts;
      else return getFuzzy(validFonts, focused.value.toString());
    }
    return [];
  }

  async run(
    command: ApplicationCommandMessage,
    args: {
      theme: string;
      font: string;
    }
  ) {
    if (
      !this.client.manager.REST_HOST ||
      !process.env.WS_AUTH ||
      !this.client.manager.ws?.open
    )
      return await command.error("CARBON_NOT_READY");

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

    const modalPromise = this.waitForModal(command);
    await (command.slashCommand as CommandInteraction).showModal(
      new Modal()
        .setTitle(command.language.get("CARBON_MODAL_TITLE"))
        .setCustomId(`carbon:${command.author.id}`)
        .addComponents(
          new MessageActionRow<ModalActionRowComponent>().addComponents(
            new TextInputComponent()
              .setCustomId("code")
              .setRequired(true)
              .setLabel(command.language.get("CARBON_MODAL_FIELD_NAME"))
              .setPlaceholder(
                command.language.get("CARBON_MODAL_FIELD_PLACEHOLDER")
              )
              .setStyle(TextInputStyles.PARAGRAPH)
          )
        )
    );

    const modal = await modalPromise;
    await modal.channel.ack();
    modal.flags = 64;

    let code = modal.interaction.fields.getTextInputValue("code");
    if (!code?.length)
      return await modal.error("COMMAND_ERROR_GENERIC", { id: "carbon" });
    try {
      code = prettier
        .format(code, {
          parser: "babel",
        })
        .trim();
    } catch {}

    await modal.channel.send(modal.language.get("CARBON_IMAGE_PROCESSING"));

    const body = {
      code,
      windowControls: false,
      fontFamily: font,
      language: "auto",
      theme,
    };

    const image = await centra(
      `${this.client.manager.REST_HOST}/img/carbon`,
      "POST"
    )
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", process.env.WS_AUTH)
      .body(body, "json")
      .send()
      .catch(() => {});

    if (!image || image.statusCode != 200) {
      if (!image || !modal.author.isSuperuser())
        return await modal.edit(modal.language.getError("CARBON_IMAGE_FAILED"));
      const response = await this.client.util.haste(
        image.body.toString(),
        true
      );
      return await modal.edit(
        modal.language.getError("CARBON_IMAGE_FAILED_SUPERUSER", {
          status: image.statusCode,
          body: response,
        })
      );
    } else {
      await modal.edit(modal.language.get("CARBON_IMAGE_UPLOADING"));
      if (!modal.author.settings.get<boolean>("utils.incognito", false))
        modal.flags = 0;
      const attach = new MessageAttachment(image.body, "code.png");
      return await modal.channel.send({ files: [attach] });
    }
  }

  waitForModal(command: ApplicationCommandMessage): Promise<ModalMessage> {
    return new Promise((resolve) => {
      this.client.modalHandlersOnce.set(`carbon:${command.author.id}`, resolve);
    });
  }
}
