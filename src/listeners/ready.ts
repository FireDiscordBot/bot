import {
  ApplicationCommandData,
  ApplicationCommand,
  Collection,
  Snowflake,
} from "discord.js";
import { getAllCommands, getCommands } from "@fire/lib/util/commandutil";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";

export default class Ready extends Listener {
  constructor() {
    super("ready", {
      emitter: "client",
      event: "ready",
    });
  }

  async exec() {
    const unavailableGuilds = this.client.guilds.cache.filter(
      (guild) => !guild.available
    );
    if (unavailableGuilds.size) {
      unavailableGuilds.forEach((guild) => {
        this.client.console.warn(
          `[Guilds] Guild ${guild.id} unavailable on connection open`
        );
      });
    }
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
    } catch {}
    this.client.ws.shards.forEach((shard) =>
      this.client.user?.setPresence({
        activities: [
          {
            name: this.client.manager.ws
              ? `with fire | ${shard.id + 1}/${this.client.options.shardCount}`
              : "with fire",
            type: "PLAYING",
          },
        ],
        status: "dnd",
        shardID: shard.id,
      })
    );
    this.client.guildSettings.items = this.client.guildSettings.items.filter(
      (value, key) => this.client.guilds.cache.has(key) || key == "0"
    ); // Remove settings for guilds that aren't cached a.k.a guilds that aren't on this cluster
    // or "0" which may be used for something later

    const guilds = this.client.guilds.cache.values() as IterableIterator<FireGuild>;
    for (const guild of guilds) {
      await guild.loadInvites();
      await guild.loadVcRoles();
      await guild.loadPermRoles();
      await guild.loadInviteRoles();
      await guild.loadReactionRoles();
      await guild.loadPersistedRoles();
      if (guild.tags?.names.length && !guild.tags.preparedSlashCommands)
        await guild.tags.prepareSlashCommands();
    }

    const slashCommands = await this.client.application.commands.fetch();

    if (slashCommands?.size) {
      let commands: (ApplicationCommandData & { id?: string })[] = [];

      for (const cmd of this.client.commandHandler.modules.values()) {
        if (
          cmd.enableSlashCommand &&
          slashCommands.find((s) => s.name == cmd.id)
        )
          commands.push(
            cmd.getSlashCommandJSON(
              slashCommands.findKey((s) => s.name == cmd.id)
            )
          );
      }

      const updated = await this.client.application.commands
        .set(commands)
        .catch((e: Error) => {
          this.client.console.error(
            `[Commands] Failed to update slash commands\n${e.stack}`
          );
          return new Collection<Snowflake, ApplicationCommand>();
        });
      if (updated && updated.size)
        this.client.console.info(
          `[Commands] Successfully bulk updated ${updated.size} slash commands`
        );

      for (const [, slashCommand] of slashCommands) {
        if (
          !this.client.getCommand(slashCommand.name) ||
          !this.client.getCommand(slashCommand.name).enableSlashCommand
        ) {
          this.client.console.warn(
            `[Commands] Deleting slash command /${slashCommand.name} due to command not being found or slash command disabled`
          );
          await this.client.application.commands
            .delete(slashCommand)
            .catch(() =>
              this.client.console.error(
                `[Commands] Failed to delete slash command /${slashCommand.name}`
              )
            );
        }
      }
    }
  }
}
