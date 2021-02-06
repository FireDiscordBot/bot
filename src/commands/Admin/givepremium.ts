import { FireMember } from "../../../lib/extensions/guildmember";
import { MessageUtil } from "../../../lib/ws/util/MessageUtil";
import { FireMessage } from "../../../lib/extensions/message";
import { EventType } from "../../../lib/ws/util/constants";
import { FireGuild } from "../../../lib/extensions/guild";
import { Inhibitor } from "../../../lib/util/inhibitor";
import { FireUser } from "../../../lib/extensions/user";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Message } from "../../../lib/ws/Message";

export default class GivePremium extends Command {
  constructor() {
    super("givepremium", {
      description: (language: Language) =>
        language.get("GIVEPREMIUM_COMMAND_DESCRIPTION"),
      restrictTo: "all",
      ownerOnly: true,
      args: [
        {
          id: "guild",
          type: /(\d{15,21}|--reload)$/im,
          readableType: "snowflake",
          default: null,
          required: false,
        },
        {
          id: "user",
          type: /(\d{15,21})$/im,
          readableType: "snowflake",
          default: null,
          required: false,
        },
        {
          id: "reason",
          type: "string",
          match: "rest",
          default: null,
          required: false,
        },
        {
          id: "reload",
          flag: "--reload",
          default: null,
          required: false,
        },
      ],
    });
  }

  async exec(
    message: FireMessage,
    args: {
      guild?: { match: any[]; matches: any[] };
      user?: { match: any[]; matches: any[] };
      reason: string;
      reload?: string;
    }
  ) {
    if (args.guild?.match[0] == "--reload") {
      try {
        const inhibitor = this.client.inhibitorHandler.reload("premium");
        return inhibitor instanceof Inhibitor
          ? await message.success()
          : await message.error();
      } catch {
        return await message.error();
      }
    }
    if (
      args.guild?.match?.length &&
      [...this.client.util.premium.keys()].includes(args.guild.match[0])
    ) {
      const guild = args.guild.match[0];
      const result = await this.client.db.query(
        "DELETE FROM premium WHERE gid=$1;",
        [guild]
      );

      if (result.status.startsWith("DELETE ")) {
        if (this.client.manager.ws) {
          this.client.manager.ws.send(
            MessageUtil.encode(
              new Message(EventType.ADMIN_ACTION, {
                user: `${message.author} (${message.author.id})`,
                guild: message.guild
                  ? `${message.guild} (${message.guild.id})`
                  : "N/A",
                shard: message.guild ? message.guild.shardID : 0,
                cluster: this.client.manager.id,
                action: `Premium was removed from ${guild}`,
              })
            )
          );
          this.sync(guild, null, "remove");
        }
        try {
          const inhibitor = this.client.inhibitorHandler.reload("premium");
          return inhibitor instanceof Inhibitor
            ? await message.success()
            : await message.error("GIVEPREMIUM_RELOAD_FAIL");
        } catch {
          return await message.error("GIVEPREMIUM_RELOAD_FAIL");
        }
      } else return await message.error("GIVEPREMIUM_DELETE_FAIL");
    }
    if (
      !args.guild?.match.length ||
      !/(\d{15,21})$/im.exec(args.guild.match[0]).length ||
      !args.user?.match.length ||
      !args.reason
    )
      return await message.error("GIVEPREMIUM_MISSING_ARGUMENTS");
    const guild = args.guild.match[0];
    const user = args.user.match[0];
    const reason = args.reason;
    if (!guild || !user || !reason) return await message.error();
    const result = await this.client.db.query(
      'INSERT INTO premium ("gid", "uid", "reason") VALUES ($1, $2, $3);',
      [guild, user, reason]
    );
    if (result.status.startsWith("INSERT 0 1")) {
      if (this.client.manager.ws) {
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.ADMIN_ACTION, {
              user: `${message.author} (${message.author.id})`,
              guild: message.guild
                ? `${message.guild} (${message.guild.id})`
                : "N/A",
              shard: message.guild ? message.guild.shardID : 0,
              cluster: this.client.manager.id,
              action: `${guild} was given premium`,
            })
          )
        );
        this.sync(guild, user, "add");
      }
      try {
        const inhibitor = this.client.inhibitorHandler.reload("premium");
        return inhibitor instanceof Inhibitor
          ? await message.success()
          : await message.error("GIVEPREMIUM_RELOAD_FAIL");
      } catch {
        return await message.error("GIVEPREMIUM_RELOAD_FAIL");
      }
    } else return await message.error("GIVEPREMIUM_INSERT_FAIL");
  }

  sync(
    guild: FireGuild | string,
    user: FireMember | FireUser | string,
    action: "add" | "remove"
  ) {
    const userId =
      user instanceof FireMember || user instanceof FireUser ? user.id : user;
    const currentGuilds = this.client.util.premium
      .filter((user) => user == userId)
      .keys();
    const guildId = guild instanceof FireGuild ? guild.id : guild;
    this.client.manager.ws?.send(
      MessageUtil.encode(
        new Message(EventType.PREMIUM_SYNC, {
          guilds: [guildId, ...currentGuilds],
          user_id: userId,
          action,
        })
      )
    );
  }
}
