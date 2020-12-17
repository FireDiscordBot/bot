import { getAllCommands, getCommands } from "../../lib/util/commandutil";
import { MessageUtil } from "../../lib/ws/util/MessageUtil";
import { Option } from "../../lib/interfaces/slashCommands";
import { EventType } from "../../lib/ws/util/constants";
import { Listener } from "../../lib/util/listener";
import { Message } from "../../lib/ws/Message";
import { Command } from "../../lib/util/command";

export default class Ready extends Listener {
  constructor() {
    super("ready", {
      emitter: "client",
      event: "ready",
    });
  }

  async exec() {
    try {
      if (typeof process.send == "function") process.send("ready");
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
    } catch (e) {
      this.client.console.error(e.stack);
    }
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

    const slashCommands: {
      id: string;
      application_id: string;
      name: string;
      description: string;
      options?: Option[];
      // @ts-ignore
    }[] = await this.client.api
      // @ts-ignore
      .applications(this.client.user.id)
      .commands.get();

    for (const cmd of this.client.commandHandler.modules.values()) {
      const command = cmd as Command;
      if (slashCommands.find((slashCommand) => slashCommand.name == cmd.id)) {
        let existing = slashCommands.find(
          (slashCommand) => slashCommand.name == cmd.id
        );
        delete existing.id;
        delete existing.application_id;
        const slashCommandJSON = command.getSlashCommandJSON();
        slashCommandJSON.options?.sort(
          (a, b) =>
            existing.options.indexOf(
              existing.options.find((option) => option.name == a.name)
            ) -
            existing.options.indexOf(
              existing.options.find((option) => option.name == b.name)
            )
        );
        // this isn't perfect and sometimes returns false even
        // though they're the same due to placement of keys
        // but it minimises requests needed
        if (JSON.stringify(slashCommandJSON) == JSON.stringify(existing))
          continue;
      }
      if (command.enableSlashCommand) await command.registerSlashCommand();
    }

    for (const slashCommand of slashCommands) {
      if (!this.client.getCommand(slashCommand.name)) {
        this.client.console.warn(
          `[Commands] Deleting slash command /${slashCommand.name} due to command not being found`
        );
        // @ts-ignore
        await this.client.api
          // @ts-ignore
          .applications(this.client.user.id)
          .commands(slashCommand.id)
          .delete()
          .catch(() =>
            this.client.console.error(
              `[Commands] Failed to delete slash command /${slashCommand.name}`
            )
          );
      }
    }
  }
}
