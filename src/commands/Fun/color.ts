import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { MessageAttachment, Role } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Argument } from "discord-akairo";
import * as tinycolor from "tinycolor2";
import * as centra from "centra";

const maybeColor = (_: FireMessage, phrase: string) =>
  phrase
    ? tinycolor(phrase).isValid()
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
          type: Argument.union("roleSilent", "memberSilent", maybeColor),
          readableType: "color",
          required: false,
          default: undefined,
        },
      ],
      aliases: ["colour", "colors", "colours"],
      enableSlashCommand: true,
      restrictTo: "all",
    });
  }

  async exec(
    message: FireMessage,
    args: { color?: Role | FireMember | tinycolor.Instance }
  ) {
    let color: tinycolor.Instance;
    if (args.color instanceof Role) color = tinycolor(args.color.hexColor);
    else if (args.color instanceof FireMember)
      color = tinycolor(args.color.displayHexColor ?? "#FFFFFF");
    else color = args.color;
    if (!color || !color.isValid()) {
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
**HSV:** ${color.toHsvString()}`;

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
