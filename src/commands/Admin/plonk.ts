import { FireMember } from "../../../lib/extensions/guildmember";
import { MessageUtil } from "../../../lib/ws/util/MessageUtil";
import { FireMessage } from "../../../lib/extensions/message";
import { EventType } from "../../../lib/ws/util/constants";
import { FireUser } from "../../../lib/extensions/user";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Message } from "../../../lib/ws/Message";

export default class Plonk extends Command {
  constructor() {
    super("plonk", {
      description: (language: Language) =>
        language.get("PLONK_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "ADD_REACTIONS"],
      args: [
        {
          id: "user",
          type: "user|member",
          required: true,
        },
        {
          id: "permanent",
          type: "boolean",
          default: true,
        },
        {
          id: "reason",
          type: "string",
          default: "bad boi",
          match: "rest",
        },
      ],
      aliases: ["unplonk"],
      hidden: true,
      restrictTo: "all",
    });
  }

  async exec(
    message: FireMessage,
    args: { user: FireMember | FireUser; permanent: boolean; reason: string }
  ) {
    if (
      !this.client.util.admins.includes(message.author.id) ||
      this.client.util.admins.includes(args.user.id)
    )
      return;

    const user = args.user instanceof FireMember ? args.user.user : args.user;
    if (!user) return;

    if (this.client.util.plonked.includes(user.id)) {
      const unblacklisted = await user.unblacklist();
      if (this.client.manager.ws && unblacklisted)
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.ADMIN_ACTION, {
              user: `${message.author} (${message.author.id})`,
              guild: `${message.guild} (${message.guild.id})`,
              shard: message.guild.shardID,
              cluster: this.client.manager.id,
              action: `${user} (${user.id}) was unblacklisted`,
            })
          )
        );
      return unblacklisted ? await message.success() : await message.error();
    } else {
      const blacklisted = await user.blacklist(args.reason, args.permanent);
      if (this.client.manager.ws && blacklisted)
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.ADMIN_ACTION, {
              user: `${message.author} (${message.author.id})`,
              guild: `${message.guild} (${message.guild.id})`,
              shard: message.guild.shardID,
              cluster: this.client.manager.id,
              action: `${user} (${user.id}) was blacklisted`,
            })
          )
        );
      return blacklisted ? await message.success() : await message.error();
    }
  }
}
