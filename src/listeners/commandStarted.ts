import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Listener } from "@fire/lib/util/listener";

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
    _: Record<string, unknown>
  ) {
    const point = {
      measurement: "commands",
      tags: {
        type: "started",
        command: command.id,
        cluster: this.client.manager.id.toString(),
        shard: message.shard.id.toString(),
        user_id: message.author.id, // easier to query tag
      },
      fields: {
        type: "started",
        command: command.id,
        // TODO: possibly rename to "source" rather than guild?
        guild: message.source,
        user: `${message.author} (${message.author.id})`,
        message_id: message.id,
        args: message.util?.parsed?.content ?? "",
      },
    };
    this.client.manager.writeToInflux([point]);
  }
}
