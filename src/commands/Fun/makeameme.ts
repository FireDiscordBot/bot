import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Argument } from "discord-akairo";
import * as centra from "centra";

export default class MakeAMeme extends Command {
  constructor() {
    super("makeameme", {
      description: (language: Language) =>
        language.get("MAKEAMEME_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "ATTACH_FILES"],
      restrictTo: "all",
      args: [
        {
          id: "image",
          type: Argument.union("memberSilent", "string"),
          readableType: "member|image",
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
    });
  }

  async exec(
    message: FireMessage,
    args: { image: FireMember | string; text: string }
  ) {
    if (!process.env.MEME_TOKEN) return await message.error();
    let image: string, text: string[];
    if (!args.image && !message.attachments.size)
      return await message.error("MAKEAMEME_NO_IMAGE");
    if (!args.text || args.text.split("|").length != 2)
      return await message.error("MAKEAMEME_NO_TEXT");
    text = args.text.replace("<", "").replace(">", "").split("|");
    if (message.attachments.size) {
      image = message.attachments.first().url;
      text[0] = args.image + " " + text[0];
    } else if (args.image instanceof FireMember)
      image = args.image.user.displayAvatarURL({
        format: "png",
        dynamic: false,
      });
    else image = args.image;
    if (!image) return await message.error("MAKEAMEME_NO_IMAGE");
    if (image.includes("cdn.discordapp.com") && !image.includes("?size="))
      image = image + "?size=2048";
    if (!text.length) return await message.error("MAKEAMEME_NO_TEXT");
    else text = text.map((value) => encodeURI(value));
    const memeReq = await centra(
      `https://memes.aero.bot/api/meme?avatar1=${image}&top_text=${text[0]}&bottom_text=${text[1]}`
    )
      .header("Authorization", process.env.MEME_TOKEN)
      .send();
    if (memeReq.statusCode != 200) return await message.error();
    else {
      const meme = memeReq.body;
      return await message.channel.send("", {
        files: [{ attachment: meme, name: `spicymeme.png` }],
      });
    }
  }
}
