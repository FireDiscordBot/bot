import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class StarboardChannel extends Command {
  constructor() {
    super("starboard-channel", {
      description: (language: Language) =>
        language.get("STARBOARD_CHANNEL_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
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
      slashOnly: true,
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

    const missing = message.guild.me
      .permissionsIn(args.channel)
      .missing([
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.VIEW_CHANNEL,
        Permissions.FLAGS.EMBED_LINKS,
      ]);
    if (missing.length)
      return await message.error("MISSING_PERMISSIONS_CLIENT", {
        permissions: missing
          .map((name) =>
            this.client.util.cleanPermissionName(name, message.language)
          )
          .filter((permission) => !!permission)
          .join(", "),
        command: "starboard channel",
      });

    const current = message.guild.starboard?.id;
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

    message.guild.settings.set<string>("starboard.channel", args.channel.id);
    return await message.success("STARBOARD_CHANNEL_SET", {
      channel: args.channel.toString(),
    });
  }
}
