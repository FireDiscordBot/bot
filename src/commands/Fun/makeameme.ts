import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import * as centra from "centra";
import { MessageAttachment } from "discord.js";

export default class MakeAMeme extends Command {
  constructor() {
    super("makeameme", {
      description: (language: Language) =>
        language.get("MAKEAMEME_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "image",
          type: "image",
          description: (language: Language) =>
            language.get("MAKEAMEME_ARGUMENTS_IMAGE_DESCRIPTION"),
          default: null,
          required: true,
        },
        {
          id: "top",
          type: "string",
          description: (language: Language) =>
            language.get("MAKEAMEME_ARGUMENTS_TOP_DESCRIPTION"),
          match: "rest",
          default: null,
          required: true,
        },
        {
          id: "bottom",
          type: "string",
          description: (language: Language) =>
            language.get("MAKEAMEME_ARGUMENTS_BOTTOM_DESCRIPTION"),
          match: "rest",
          default: null,
          required: true,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { image: MessageAttachment; top: string; bottom: string }
  ) {
    if (!process.env.MEME_TOKEN)
      return await command.error("ERROR_CONTACT_SUPPORT");
    let image = args.image?.url;
    try {
      const url = new URL(image);
      if (url.hostname == "cdn.discordapp.com" && !url.search)
        image = image + "?size=2048";
    } catch {}
    const memeReq = await centra(
      `https://memes.aero.bot/api/meme?avatar1=${encodeURI(
        image
      )}&top_text=${encodeURI(args.top)}&bottom_text=${encodeURI(args.bottom)}`
    )
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", process.env.MEME_TOKEN)
      .send();
    if (memeReq.statusCode != 200)
      return await command.error("ERROR_CONTACT_SUPPORT");
    else {
      const meme = memeReq.body;
      if (meme.byteLength >= 8e6)
        return await command.error("MAKEAMEME_TOO_LARGE");
      return await command.channel
        .send({
          files: [{ attachment: meme, name: "spicymeme.png" }],
        })
        .catch(() => command.error("MAKEAMEME_UPLOAD_FAIL"));
    }
  }
}
