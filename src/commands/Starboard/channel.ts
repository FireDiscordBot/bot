import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class StarboardChannel extends Command {
  constructor() {
    super("starboard-channel", {
      description: (language: Language) =>
        language.get("STARBOARD_CHANNEL_DESCRIPTION"),
      userPermissions: ["MANAGE_GUILD"],
      restrictTo: "guild",
      args: [
        {
          id: "channel",
          type: "textChannel",
          required: false,
          default: undefined,
        },
      ],
      parent: "starboard",
    });
  }

  async exec(message: FireMessage, args: { channel?: FireTextChannel }) {
    if (!args.channel) {
      await this.client.db
        .query("DELETE FROM starboard WHERE gid=$1;", [message.guild.id])
        .catch(() => {});
      await this.client.db
        .query("DELETE FROM starboard_reactions WHERE gid=$1;", [
          message.guild.id,
        ])
        .catch(() => {});
      message.guild.settings.delete("starboard.channel");
      return message.guild.settings.has("starboard.channel")
        ? await message.error()
        : await message.success("STARBOARD_CHANNEL_RESET");
    }

    const current = message.guild.settings.get("starboard.channel");
    if (current && args.channel.id != current) {
      await this.client.db
        .query("DELETE FROM starboard WHERE gid=$1;", [message.guild.id])
        .catch(() => {});
      await this.client.db
        .query("DELETE FROM starboard_reactions WHERE gid=$1;", [
          message.guild.id,
        ])
        .catch(() => {});
    }

    message.guild.settings.set("starboard.channel", args.channel.id);
    return await message.success(
      "STARBOARD_CHANNEL_SET",
      args.channel.toString()
    );
  }
}
