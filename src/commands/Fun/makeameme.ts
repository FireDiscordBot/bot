import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";
import * as centra from "centra";

export default class MakeAMeme extends Command {
  constructor() {
    super("makeameme", {
      description: (language: Language) =>
        language.get("MAKEAMEME_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.ATTACH_FILES,
      ],
      restrictTo: "all",
      args: [
        {
          id: "image",
          type: "string",
          default: null,
          required: true,
        },
        {
          id: "text",
          type: "string",
          match: "rest",
          default: null,
          required: true,
        },
      ],
      enableSlashCommand: true,
    });
  }

  async exec(message: FireMessage, args: { image: string; text: string }) {
    if (!process.env.MEME_TOKEN)
      return await message.error("ERROR_CONTACT_SUPPORT");
    let image: string, text: string[];
    if (!args.image && !message.attachments.size)
      return await message.error("MAKEAMEME_NO_IMAGE");
    if (!args.text || args.text.split("|").length != 2)
      return await message.error("MAKEAMEME_NO_TEXT");
    text = args.text.replace("<", "").replace(">", "").split("|");
    if (message.attachments.size) {
      image = message.attachments.first().url;
      text[0] = args.image + " " + text[0];
    } else image = image || (args.image as string);
    if (!image) return await message.error("MAKEAMEME_NO_IMAGE");
    try {
      const url = new URL(image);
      if (url.hostname == "cdn.discordapp.com" && !url.search)
        image = image + "?size=2048";
    } catch {}
    if (!text.length) return await message.error("MAKEAMEME_NO_TEXT");
    else text = text.map((value) => encodeURI(value));
    const memeReq = await centra(
      `https://memes.aero.bot/api/meme?avatar1=${encodeURI(image)}&top_text=${
        text[0]
      }&bottom_text=${text[1]}`
    )
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", process.env.MEME_TOKEN)
      .send();
    if (memeReq.statusCode != 200)
      return await message.error("ERROR_CONTACT_SUPPORT");
    else {
      const meme = memeReq.body;
      if (meme.byteLength >= 8e6)
        return await message.error("MAKEAMEME_TOO_LARGE");
      return await message.channel
        .send({
          files: [{ attachment: meme, name: "spicymeme.png" }],
        })
        .catch(() => message.error("MAKEAMEME_UPLOAD_FAIL"));
    }
  }
}
