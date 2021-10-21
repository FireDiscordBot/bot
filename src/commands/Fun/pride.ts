import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { MessageAttachment } from "discord.js";
import * as centra from "centra";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Option } from "@fire/lib/interfaces/interactions";

const flagTypes = [
  "transgender",
  "agender",
  "asexual",
  "bisexual",
  "genderfluid",
  "lesbian",
  "nonbinary",
  "pansexual",
  "gay",
];

export default class Pride extends Command {
  constructor() {
    super("pride", {
      description: (language: Language) =>
        language.get("PRIDE_COMMAND_DESCRIPTION"),
      restrictTo: "all",
      args: [
        {
          id: "flag",
          type: "string",
          autocomplete: true,
          required: true, // will make slash arg required
          default: "transgender", // trans rights are human rights <3
        },
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
      enableSlashCommand: true,
    });
  }

  async autocomplete(guild: FireGuild, option: Option) {
    // allows it to be immediately updated rather than waiting for the command to propogate
    return flagTypes;
  }

  async exec(
    message: FireMessage,
    args?: { flag: string; user?: FireMember | FireUser; overlay?: boolean }
  ) {
    if (!args.user && typeof args.user == "object") return;
    if (!flagTypes.includes(args.flag)) return; // shouldn't be possible with slash cmd so I ain't giving an error
    const user =
      args.user instanceof FireMember
        ? args.user.user
        : args.user || message.author;
    const overlay = !args.overlay;
    const prideReq = await centra(
      `https://api.ravy.lgbt/${overlay ? "overlay" : "circle"}`
    )
      .header("User-Agent", this.client.manager.ua)
      .query("type", args.flag ?? "transgender")
      .query("image", user.displayAvatarURL({ size: 1024, format: "png" }))
      .send();

    const attachment = new MessageAttachment(
      prideReq.body,
      "avatar.png"
    ).setDescription(
      overlay
        ? (message.guild ?? message).language.get("PRIDE_IMAGE_ALT_OVERLAY", {
            user: message.author.username,
            flag: args.flag ?? "transgender",
          })
        : (message.guild ?? message).language.get("PRIDE_IMAGE_ALT_CIRCLE", {
            user: message.author.username,
            flag: args.flag ?? "transgender",
          })
    );
    return await message.channel.send({ files: [attachment] });
  }
}
