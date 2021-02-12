import { FireMessage } from "@fire/lib/extensions/message";
import { roleConverter } from "@fire/lib/util/converters";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import * as tinycolor from "tinycolor2";
import * as centra from "centra";
import { constants } from "@fire/lib/util/constants";
import { MessageAttachment } from "discord.js";

export default class Color extends Command {
  constructor() {
    super("color", {
      description: (language: Language) =>
        language.get("COLOR_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "color",
          type: "string",
          required: false,
          default: null,
        },
      ],
      aliases: ["colour", "colors", "colours"],
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage, args: { color?: string }) {
    // i cba to make a separate type caster for role/string
    // so consider this an undocumented feature ok cool
    const isARole = await roleConverter(message, args.color, true);
    let color = args.color ? tinycolor(args.color) : tinycolor.random();
    // prioritize tinycolor() over role
    if (!color.isValid()) {
      if (isARole) color = tinycolor(isARole.hexColor);
      else
        return await message.error(
          "COLOR_ARGUMENT_INVALID",
          tinycolor.random().toHexString()
        );
    }

    const colorInfo = `<:pallete:804044718379237407> ${message.language.get(
      "COLOR_HEADING",
      color.toName() || color.toHexString()
    )}
    
**HEX:** ${color.toHexString()}
**RGB:** ${color.toRgbString()}
**HSL:** ${color.toHslString()}
**HSV:** ${color.toHsvString()}`;

    const image = await centra(
      `${constants.url.imageGen}/color?color=${color.toHex()}`
    )
      .header("User-Agent", "Fire Discord Bot")
      .send();

    if (image.statusCode != 200) return await message.channel.send(colorInfo);
    else {
      const attachment = new MessageAttachment(
        image.body,
        `${color.toHex()}.png`
      );
      return await message.channel.send(colorInfo, attachment);
    }
  }
}
