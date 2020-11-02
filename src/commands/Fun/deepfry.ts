import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Argument } from "discord-akairo";
import * as centra from "centra";

export default class Deepfry extends Command {
  constructor() {
    super("deepfry", {
      description: (language: Language) =>
        language.get("DEEPFRY_COMMAND_DESCRIPTION"),
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
      ],
      aliases: ["df"],
    });
  }

  async exec(message: FireMessage, args: { image: FireMember | string }) {
    if (!process.env.MEME_TOKEN) return await message.error();
    let image: string;
    if (!args.image && !message.attachments.size)
      image = message.author.displayAvatarURL({
        format: "png",
        dynamic: false,
      });
    if (message.attachments.size) {
      image = message.attachments.first().url;
    } else if (args.image instanceof FireMember)
      image = args.image.user.displayAvatarURL({
        format: "png",
        dynamic: false,
      });
    else image = args.image;
    if (image.includes("cdn.discordapp.com") && !image.includes("?size="))
      image = image + "?size=2048";
    const deepfryReq = await centra(
      `https://memes.aero.bot/api/deepfry?avatar1=${image}`
    )
      .header("Authorization", process.env.MEME_TOKEN)
      .send();
    if (deepfryReq.statusCode != 200) return await message.error();
    else {
      const meme = deepfryReq.body;
      return await message.channel
        .send("", {
          files: [{ attachment: meme, name: `f'deepfried.png` }],
        })
        .catch(async (reason) => {
          return await message.error("DEEPFRY_UPLOAD_FAIL");
        });
    }
  }
}
