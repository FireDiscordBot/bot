import { getAllCommands, getCommands } from "../../lib/util/commandUtil";
import { MessageUtil } from "../../lib/ws/util/MessageUtil";
import { EventType } from "../../lib/ws/util/constants";
import { Listener } from "../../lib/util/listener";
import { Message } from "../../lib/ws/Message";
import { Command } from "../../lib/util/command";
import { commandTypeCaster } from "../arguments/command";

export default class Ready extends Listener {
  constructor() {
    super("ready", {
      emitter: "client",
      event: "ready",
    });
  }

  async exec() {
    this.client.commandHandler.modules
      .filter(
        (command: Command) =>
          command.guilds.length &&
          command.guilds.every((id) => {
            const shard = parseInt(
              (
                (BigInt(id) >> 22n) %
                BigInt(this.client.options.shardCount)
              ).toString()
            );
            if (!(this.client.options.shards as number[]).includes(shard))
              return true;
          })
      )
      .forEach((command) => command.remove());
    try {
      process.send("ready");
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.READY_CLIENT, {
            id: this.client.manager.id,
            commands: getCommands(this.client),
            allCommands: getAllCommands(this.client),
            avatar: this.client.user.displayAvatarURL({
              size: 4096,
            }),
          })
        )
      );
    } catch {}
    this.client.ws.shards.forEach((shard) =>
      this.client.user?.setPresence({
        activity: {
          name: `with fire | ${shard.id + 1}/${this.client.options.shardCount}`,
        },
        status: "dnd",
        shardID: shard.id,
      })
    );
    this.client.guildSettings.items = this.client.guildSettings.items.filter(
      (value, key) => this.client.guilds.cache.has(key) || key == "0"
    ); // Remove settings for guilds that aren't cached a.k.a guilds that aren't on this cluster
    // or "0" which may be used for something later
  }
}
