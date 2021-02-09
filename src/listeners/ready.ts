import { getAllCommands, getCommands } from "../../lib/util/commandutil";
import { MessageUtil } from "../../lib/ws/util/MessageUtil";
import { Option } from "../../lib/interfaces/slashCommands";
import { EventType } from "../../lib/ws/util/constants";
import { FireGuild } from "../../lib/extensions/guild";
import { Listener } from "../../lib/util/listener";
import { Message } from "../../lib/ws/Message";

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
        activity: {
          name: this.client.manager.ws
            ? `with fire | ${shard.id + 1}/${this.client.options.shardCount}`
            : "with fire",
        },
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
      if (guild.hasExperiment("2tWDukMy-gpH_Pf4_BVfP"))
        this.client.util.hasRoleUpdates.push(guild.id);
      await guild.loadInvites();
      await guild.loadVcRoles();
      await guild.loadInviteRoles();
      await guild.loadReactionRoles();
      await guild.loadPersistedRoles();
    }

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

    let commands: {
      name: string;
      description: string;
      options?: Option[];
    }[] = [];

    for (const cmd of this.client.commandHandler.modules.values()) {
      if (cmd.enableSlashCommand && slashCommands.find((s) => s.name == cmd.id))
        commands.push(cmd.getSlashCommandJSON());
    }

    // @ts-ignore
    await this.client.api
      // @ts-ignore
      .applications(this.client.user.id)
      .commands.put({ data: commands })
      // TODO make api slash command interface
      .then((updated: any[]) =>
        this.client.console.info(
          `[Commands] Successfully bulk updated ${updated.length} slash commands`
        )
      )
      .catch((e: Error) =>
        this.client.console.error(
          `[Commands] Failed to update slash commands\n${e.stack}`
        )
      );

    for (const slashCommand of slashCommands) {
      if (
        !this.client.getCommand(slashCommand.name) ||
        !this.client.getCommand(slashCommand.name).enableSlashCommand
      ) {
        this.client.console.warn(
          `[Commands] Deleting slash command /${slashCommand.name} due to command not being found or slash command disabled`
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

    this.client.cacheSweep();
  }
}
