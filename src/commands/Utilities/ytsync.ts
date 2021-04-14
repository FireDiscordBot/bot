import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { VoiceChannel } from "discord.js";

export default class YTSync extends Command {
  constructor() {
    super("ytsync", {
      description: (language: Language) =>
        language.get("YTSYNC_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "channel",
          type: "voiceChannel",
          required: true,
          default: null,
        },
      ],
      requiresExperiment: { id: "P7WUNExn1ysehVPwHXT5T", treatmentId: 1 },
      restrictTo: "guild",
    });
  }

  async exec(message: FireMessage, args: { channel: VoiceChannel }) {
    if (!args.channel?.id || args.channel?.type != "voice")
      return await message.error("YTSYNC_CHANNEL_REQUIRED");

    const invite = await this.client.req
      .channels(args.channel.id)
      .invites.post({
        data: {
          validate: null,
          max_age: 604800,
          max_uses: 0,
          target_type: 2,
          target_application_id: "755600276941176913",
          temporary: false,
        },
      })
      .catch(() => {});
    if (!invite?.code) return await message.error();
    else return await message.channel.send(`https://discord.gg/${invite.code}`);
  }
}
