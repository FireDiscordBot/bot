import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { MessageAttachment, Role } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import * as tinycolor from "tinycolor2";
import * as centra from "centra";

const maybeColor = (phrase: string) =>
  phrase
    ? typeof tinycolor(phrase)?.isValid == "function" &&
      tinycolor(phrase).isValid()
      ? tinycolor(phrase)
      : undefined
    : tinycolor.random();

export default class Color extends Command {
  constructor() {
    super("color", {
      description: (language: Language) =>
        language.get("COLOR_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "color",
          type: "string",
          readableType: "color",
          description: (language: Language) =>
            language.get("COLOR_ARGUMENT_COLOR_DESCRIPTION"),
          required: false,
          default: undefined,
        },
        {
          id: "member",
          type: "member",
          description: (language: Language) =>
            language.get("COLOR_ARGUMENT_MEMBER_DESCRIPTION"),
          required: false,
          default: undefined,
        },
        {
          id: "role",
          type: "role",
          description: (language: Language) =>
            language.get("COLOR_ARGUMENT_ROLE_DESCRIPTION"),
          required: false,
          default: undefined,
        },
      ],
      enableSlashCommand: true,
      slashOnly: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { color?: string; member?: FireMember; role?: Role }
  ) {
    const colorStr =
      args.member?.displayHexColor ?? args.role?.hexColor ?? args.color;
    const color: tinycolor.Instance = maybeColor(colorStr);
    if (!color || typeof color.isValid != "function" || !color.isValid()) {
      return await message.error("COLOR_ARGUMENT_INVALID", {
        random: tinycolor.random().toHexString(),
      });
    }

    const colorInfo = `<:pallete:804044718379237407> ${message.language.get(
      "COLOR_HEADING",
      { color: color.toName() || color.toHexString() }
    )}

**HEX:** ${color.toHexString()}
**HEX8:** ${color.toHex8String()}
**RGB:** ${color.toRgbString()}
**HSL:** ${color.toHslString()}
**HSV:** ${color.toHsvString()}
**${message.language.get("COLOR_DECIMAL")}:** ${parseInt(color.toHex(), 16)}`;

    const image = await centra(
      `${constants.url.imageGen}color?color=${color.toHex()}`
    )
      .header("User-Agent", this.client.manager.ua)
      .send();

    if (image.statusCode != 200)
      return await message.channel.send({ content: colorInfo });
    else {
      const attachment = new MessageAttachment(
        image.body,
        `${color.toHex()}.png`
      );
      if (color.toName())
        attachment.setDescription(
          (message.guild ?? message).language.get("COLOR_IMAGE_ALT", {
            color: color.toName(),
          })
        );
      return await message.channel.send({
        content: colorInfo,
        files: [attachment],
      });
    }
  }
}
