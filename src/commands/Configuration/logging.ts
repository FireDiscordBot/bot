import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { GuildLogManager } from "@fire/lib/util/logmanager";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

type validTypes =
  | "mod"
  | "moderation"
  | "action"
  | "actions"
  | "member"
  | "members";
const valid = ["mod", "moderation", "action", "actions", "member", "members"];
const typeMapping = {
  moderation: ["mod", "moderation"],
  action: ["action", "actions"],
  members: ["member", "members"],
};
const langKeys = {
  types: "moderation, action, members",
};

export default class Logging extends Command {
  constructor() {
    super("logging", {
      description: (language: Language) =>
        language.get("LOGGING_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      args: [
        {
          id: "type",
          type: "string",
          autocomplete: true,
          required: true,
          default: null,
        },
        {
          id: "channel",
          type: "textChannelSilent",
          required: false,
          default: null,
        },
      ],
      aliases: ["logs", "log", "setlogs", "setlog"],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  async autocomplete() {
    // allows it to be immediately updated rather than waiting for the command to propogate
    return Object.keys(typeMapping);
  }

  async exec(
    message: FireMessage,
    args: {
      type: validTypes;
      channel: FireTextChannel;
    }
  ) {
    args.type = args.type?.toLowerCase() as validTypes;
    if (!args.type || !valid.includes(args.type))
      return await message.error("LOGGING_INVALID_TYPE", langKeys);
    const [type] = Object.entries(typeMapping).find(([, names]) =>
      names.includes(args.type)
    );
    const otherTypes = Object.keys(typeMapping).filter((t) => t != type);
    const otherChannels = otherTypes.map((t) =>
      message.guild.settings.get<string>(`log.${t}`)
    );
    if (
      args.channel &&
      otherChannels.includes(args.channel.id) &&
      message.guild.memberCount >= 1000
    )
      return await message.error("LOGGING_SIZE_SAME_CHANNEL");
    if (!args.channel) {
      let deleted: any;
      try {
        deleted = await message.guild.settings.delete(`log.${type}`);
        if (!message.guild.logger)
          message.guild.logger = new GuildLogManager(
            this.client,
            message.guild
          );
        await message.guild.logger.refreshWebhooks().catch(() => {});
      } catch {}
      return deleted
        ? await message.success(
            `LOGGING_DISABLED_${type.toUpperCase()}` as LanguageKeys
          )
        : await message.error("ERROR_CONTACT_SUPPORT");
    } else {
      let set: any;
      try {
        set = await message.guild.settings.set<string>(
          `log.${type}`,
          args.channel.id
        );
        if (set) {
          if (!message.guild.logger)
            message.guild.logger = new GuildLogManager(
              this.client,
              message.guild
            );
          await message.guild.logger.refreshWebhooks().catch(() => {});
        }
      } catch {}
      return set
        ? await message.success(
            `LOGGING_ENABLED_${type.toUpperCase()}` as LanguageKeys
          )
        : await message.error("ERROR_CONTACT_SUPPORT");
    }
  }
}
