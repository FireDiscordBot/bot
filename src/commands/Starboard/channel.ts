import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class StarboardChannel extends Command {
  constructor() {
    super("starboard-channel", {
      description: (language: Language) =>
        language.get("STARBOARD_CHANNEL_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageGuild],
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

  async run(
    command: ApplicationCommandMessage,
    args: { channel?: FireTextChannel }
  ) {
    if (!args.channel) {
      await this.client.db
        .query("DELETE FROM starboard WHERE gid=$1;", [command.guild.id])
        .catch(() => {});
      await this.client.db
        .query("DELETE FROM starboard_reactions WHERE gid=$1;", [
          command.guild.id,
        ])
        .catch(() => {});
      await command.guild.settings.delete("starboard.channel");
      return command.guild.settings.has("starboard.channel")
        ? await command.error("ERROR_CONTACT_SUPPORT")
        : await command.success("STARBOARD_CHANNEL_RESET");
    }

    const missing = command.guild.me
      .permissionsIn(args.channel)
      .missing([
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.EmbedLinks,
      ]);
    if (missing.length)
      return await command.error("MISSING_PERMISSIONS_CLIENT", {
        permissions: missing
          .map((name) =>
            this.client.util.cleanPermissionName(name, command.language)
          )
          .filter((permission) => !!permission)
          .join(", "),
        command: "starboard channel",
      });

    const current = command.guild.starboard?.id;
    if (current && args.channel.id != current) {
      await this.client.db
        .query("DELETE FROM starboard WHERE gid=$1;", [command.guild.id])
        .catch(() => {});
      await this.client.db
        .query("DELETE FROM starboard_reactions WHERE gid=$1;", [
          command.guild.id,
        ])
        .catch(() => {});
    }

    command.guild.settings.set<string>("starboard.channel", args.channel.id);
    return await command.success("STARBOARD_CHANNEL_SET", {
      channel: args.channel.toString(),
    });
  }
}
