import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { FireUser } from "../../../lib/extensions/user";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { MessageAttachment } from "discord.js";
import * as centra from "centra";

export default class Trans extends Command {
  constructor() {
    super("trans", {
      description: (language: Language) =>
        language.get("TRANS_COMMAND_DESCRIPTION"),
      restrictTo: "all",
      args: [
        {
          id: "user",
          type: "user|member",
          default: undefined,
          required: false,
        },
        {
          id: "overlay",
          flag: "--overlay",
          required: false,
          default: false, // akairo is ignoring this idk why
          match: "flag",
        },
      ],
    });
  }

  async exec(
    message: FireMessage,
    args?: { user?: FireMember | FireUser; overlay?: boolean }
  ) {
    if (!args.user && typeof args.user == "object") return;
    const user =
      args.user instanceof FireMember
        ? args.user.user
        : args.user || message.author;
    const overlay = !args.overlay;
    const transReq = await centra(
      `https://api.ravy.lgbt/${overlay ? "overlay" : "circle"}`
    )
      .query("image", user.displayAvatarURL({ size: 1024, format: "png" }))
      .send();

    const attachment = new MessageAttachment(transReq.body, "avatar.png");
    return await message.channel.send(attachment);
  }
}
