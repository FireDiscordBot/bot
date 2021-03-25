import {
  APIApplicationCommand,
  ApplicationCommandPermissions,
  ApplicationCommandPermissionType,
  Option,
} from "@fire/lib/interfaces/slashCommands";
import { getAllCommands, getCommands } from "@fire/lib/util/commandutil";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";
import { Collection } from "discord.js";

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
      await guild.loadInvites();
      await guild.loadVcRoles();
      await guild.loadPermRoles();
      await guild.loadInviteRoles();
      await guild.loadReactionRoles();
      await guild.loadPersistedRoles();
      if (guild.tags?.names.length && !guild.tags.preparedSlashCommands)
        await guild.tags.prepareSlashCommands();
    }

    const slashCommands: {
      id: string;
      application_id: string;
      name: string;
      description: string;
      options?: Option[];
    }[] = await this.client.req
      .applications(this.client.user.id)
      .commands.get();

    if (slashCommands?.length) {
      let commands: {
        name: string;
        description: string;
        options?: Option[];
        default_permission: boolean;
      }[] = [];

      for (const cmd of this.client.commandHandler.modules.values()) {
        if (
          cmd.enableSlashCommand &&
          slashCommands.find((s) => s.name == cmd.id)
        )
          commands.push(cmd.getSlashCommandJSON());
      }

      const updated: APIApplicationCommand[] = await this.client.req
        .applications(this.client.user.id)
        .commands.put({ data: commands })
        .catch((e: Error) => {
          this.client.console.error(
            `[Commands] Failed to update slash commands\n${e.stack}`
          );
          return [];
        });
      if (updated.length)
        this.client.console.info(
          `[Commands] Successfully bulk updated ${updated.length} slash commands`
        );

      for (const slashCommand of updated) {
        if (slashCommand.default_permission) continue;
        const command = this.client.getCommand(slashCommand.name);
        if (!command.requiresExperiment) continue;
        const experiment = this.client.experiments.get(
          command.requiresExperiment.id
        );
        // there isn't really a good way to do user experiment permissions since they're guild bound
        if (experiment.kind != "guild") continue;
        for (const [, guild] of this.client.guilds.cache as Collection<
          string,
          FireGuild
        >) {
          if (
            !guild.hasExperiment(
              experiment.id,
              command.requiresExperiment.treatmentId
            )
          )
            continue;
          const everyoneId = guild.roles.everyone.id; // should always be same as guild id
          let slashCommandPermissions: ApplicationCommandPermissions[] = await this.client.req
            .applications(this.client.user.id)
            .guilds(guild.id)
            .commands(slashCommand.id)
            .permissions.get()
            .catch(() => []);
          slashCommandPermissions = slashCommandPermissions.filter(
            (permissions) => permissions.id != everyoneId
          );
          slashCommandPermissions.push({
            id: everyoneId,
            type: ApplicationCommandPermissionType.ROLE,
            permission: true,
          });
          await this.client.req
            .applications(this.client.user.id)
            .guilds(guild.id)
            .commands(slashCommand.id)
            .permissions.put({ data: slashCommandPermissions })
            .catch((e: Error) => {
              this.client.console.error(
                `[Commands] Failed to update slash command permissions for locked command  ${slashCommand.name} in guild ${guild.name}\n${e.stack}`
              );
            });
        }
      }

      for (const slashCommand of slashCommands) {
        if (
          !this.client.getCommand(slashCommand.name) ||
          !this.client.getCommand(slashCommand.name).enableSlashCommand
        ) {
          this.client.console.warn(
            `[Commands] Deleting slash command /${slashCommand.name} due to command not being found or slash command disabled`
          );
          await this.client.req
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

    this.client.cacheSweep();
  }
}
