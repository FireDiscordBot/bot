import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import * as centra from "centra";
import { MessageAttachment } from "discord.js";

export default class Deepfry extends Command {
  constructor() {
    super("deepfry", {
      description: (language: Language) =>
        language.get("DEEPFRY_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "image",
          type: "image",
          description: (language: Language) =>
            language.get("DEEPFRY_ARGUMENTS_IMAGE_DESCRIPTION"),
          default: null,
          required: false,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
    });
  }

  async exec(message: FireMessage, args: { image: MessageAttachment }) {
    if (!process.env.MEME_TOKEN)
      return await message.error("ERROR_CONTACT_SUPPORT");
    let image: string;
    if (!args.image)
      image = message.author.displayAvatarURL({
        format: "png",
        dynamic: false,
      });
    else image = args.image.url;
    if (!image) return await message.error("DEEPFRY_NO_IMAGE");
    try {
      const url = new URL(image);
      if (
        (url.hostname == "cdn.discordapp.com" ||
          url.hostname == "media.discordapp.net" ||
          url.hostname.endsWith("discord.co")) &&
        !url.search
      )
        image = image + "?size=2048";
    } catch {}
    const deepfryReq = await centra(
      `https://memes.aero.bot/api/deepfry?avatar1=${image}`
    )
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", process.env.MEME_TOKEN)
      .send();
    if (deepfryReq.statusCode != 200)
      return await message.error("ERROR_CONTACT_SUPPORT");
    else {
      const fried = deepfryReq.body;
      if (fried.byteLength >= 8e6)
        return await message.error("DEEPFRY_TOO_LARGE");
      return await message.channel
        .send({
          files: [{ attachment: fried, name: "deepfried.png" }],
        })
        .catch(() => message.error("DEEPFRY_UPLOAD_FAIL"));
    }
  }
}
