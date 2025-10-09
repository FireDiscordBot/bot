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
        shard: message.shard.toString(),
        user_id: message.author.id, // easier to query tag
      },
      fields: {
        type: "started",
        command: command.id,
        // TODO: possibly rename to "source" rather than guild?
        guild: message.source,
        user: `${message.author} (${message.author.id})`,
        message_id: message.id,
        args:
          message.util?.parsed?.content ?? args
            ? inspect(args, {
                showHidden: false,
                getters: true,
                depth: 0,
              })
            : "",
      },
    };
    this.client.manager.writeToInflux([point], {
      // command started logs are kept forever to power
      // the commands used counter on the WIP Fire website
      retentionPolicy:
        process.env.NODE_ENV == "production" ? "aether_inf" : undefined,
    });
  }
}
