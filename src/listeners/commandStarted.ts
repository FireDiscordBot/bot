import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Listener } from "@fire/lib/util/listener";
import { inspect } from "util";

export default class CommandStarted extends Listener {
  constructor() {
    super("commandStarted", {
      emitter: "commandHandler",
      event: "commandStarted",
    });
  }

  async exec(
    message: FireMessage,
    command: Command,
    args: Record<string, unknown>
  ) {
    const point = {
      measurement: "commands",
      tags: {
        type: "started",
        command: command.id,
        cluster: this.client.manager.id.toString(),
        shard: message.guild?.shardId.toString() ?? "0",
      },
      fields: {
        guild_id: message.guild ? message.guild.id : "N/A",
        guild: message.guild ? message.guild.name : "N/A",
        user_id: message.author.id,
        user: message.author.toString(),
        message_id: message.id,
        args: "",
      },
    };
    try {
      point.fields.args = inspect(args, false, 0);
    } catch {}
    this.client.influx([point]);
  }
}
