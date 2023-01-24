import { FireMember } from "@fire/lib/extensions/guildmember";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { FireMessage } from "@fire/lib/extensions/message";
import { EventType } from "@fire/lib/ws/util/constants";
import { FireUser } from "@fire/lib/extensions/user";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Message } from "@fire/lib/ws/Message";

export default class Alias extends Command {
  constructor() {
    super("alias", {
      description: (language: Language) =>
        language.get("ALIAS_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "user",
          // this could be just user but member allows username lookup
          type: "user|member",
          required: true,
          default: null,
        },
        {
          id: "alias",
          type: "string",
          match: "rest",
          required: true,
          default: null,
        },
      ],
      superuserOnly: true,
      restrictTo: "all",
    });
  }

  async exec(
    message: FireMessage,
    args: { user: FireMember | FireUser; alias: string }
  ) {
    const { user, alias } = args;

    if (!user) return;
    if (!alias) return await message.error("ALIAS_REQUIRED_ARG");

    const existing = this.client.aliases.findKey((aliases) =>
      aliases.includes(alias.toLowerCase())
    );
    if (existing && existing != user.id)
      return await message.error("ALIAS_EXISTS");

    let current = this.client.aliases.get(user.id) || [];
    if (current.includes(alias.toLowerCase()))
      current = current.filter((a) => a != alias.toLowerCase());
    else current.push(alias.toLowerCase());

    if (this.client.aliases.has(user.id))
      await this.client.db.query(
        current.length
          ? "UPDATE aliases SET aliases=$1 WHERE uid=$2;"
          : "DELETE FROM aliases WHERE uid=$1;",
        current.length ? [current, user.id] : [user.id]
      );
    else
      await this.client.db.query(
        "INSERT INTO aliases (uid, aliases) VALUES ($1, $2)",
        [user.id, current]
      );
    if (current.length) this.client.aliases.set(user.id, current);
    else this.client.aliases.delete(user.id);

    this.client.manager.ws?.send(
      MessageUtil.encode(
        new Message(EventType.ALIAS_SYNC, {
          user: user.id,
          aliases: current,
        })
      )
    );

    return await message.success("SLASH_COMMAND_HANDLE_SUCCESS");
  }
}
