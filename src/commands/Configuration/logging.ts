import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { TextChannel } from "discord.js";

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
      channel: TextChannel;
    }
  ) {
    args.type = args.type?.toLowerCase() as validTypes;
    if (!args.type || !valid.includes(args.type))
      return await message.error(
        "LOGGING_INVALID_TYPE",
        "moderation, action, members"
      );
    const [type] = Object.entries(typeMapping).find(([id, names]) =>
      names.includes(args.type)
    );
    if (!args.channel) {
      let deleted: any;
      try {
        deleted = await message.guild.settings.delete(`log.${type}`);
      } catch {}
      return deleted
        ? await message.success(`LOGGING_DISABLED_${type.toUpperCase()}`)
        : await message.error();
    } else {
      let set: any;
      try {
        set = await message.guild.settings.set(`log.${type}`, args.channel.id);
      } catch {}
      return set
        ? await message.success(`LOGGING_ENABLED_${type.toUpperCase()}`)
        : await message.error();
    }
  }
}
