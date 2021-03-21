import { FireTextChannel} from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

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

export default class Logging extends Command {
  constructor() {
    super("logging", {
      description: (language: Language) =>
        language.get("LOGGING_COMMAND_DESCRIPTION"),
      userPermissions: ["MANAGE_GUILD"],
      args: [
        {
          id: "type",
          type: valid,
          slashCommandOptions: ["moderation", "actions", "members"],
          readableType: "mod|action|member",
          slashCommandType: "type",
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

  async exec(
    message: FireMessage,
    args: {
      type: validTypes;
      channel: FireTextChannel;
    }
  ) {
    args.type = args.type?.toLowerCase() as validTypes;
    if (!args.type || !valid.includes(args.type))
      return await message.error(
        "LOGGING_INVALID_TYPE",
        "moderation, action, members"
      );
    const [type] = Object.entries(typeMapping).find(([, names]) =>
      names.includes(args.type)
    );
    const otherTypes = Object.keys(typeMapping).filter((t) => t != type);
    const otherChannels = otherTypes.map(
      (t) => message.guild.settings.get(`log.${t}`) as string
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
        await message.guild.logger.refreshWebhooks().catch(() => {});
      } catch {}
      return deleted
        ? await message.success(`LOGGING_DISABLED_${type.toUpperCase()}`)
        : await message.error();
    } else {
      let set: any;
      try {
        set = await message.guild.settings.set(`log.${type}`, args.channel.id);
        if (set) await message.guild.logger.refreshWebhooks().catch(() => {});
      } catch {}
      return set
        ? await message.success(`LOGGING_ENABLED_${type.toUpperCase()}`)
        : await message.error();
    }
  }
}
