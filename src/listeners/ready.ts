import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireAPIApplicationCommand } from "@fire/lib/interfaces/interactions";
import { Command } from "@fire/lib/util/command";
import { getAllCommands, getCommands } from "@fire/lib/util/commandutil";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import {
  ApplicationCommandType,
  RESTPutAPIApplicationCommandsResult,
} from "discord-api-types/v9";
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
      unavailableGuilds.forEach((guild: FireGuild) => {
        guild.console.warn("Server unavailable on connection open");
      });
    }

    // we need to force fetch to get certain properties (e.g. banner)
    await this.client.user.fetch().catch(() => {});

    for (const [, guild] of this.client.guilds.cache) {
      const member = guild?.members.me as FireMember;
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.GUILD_CREATE, {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            member: member.toAPIMemberJSON(),
          })
        )
      );
    }

    try {
      if (typeof process.send == "function") process.send("ready");
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.READY_CLIENT, {
            avatar: this.client.user.displayAvatarURL({
              size: 4096,
            }),
            allCommands: getAllCommands(this.client),
            commands: getCommands(this.client),
            name: this.client.user.username,
            id: this.client.manager.id,
            env: process.env.NODE_ENV,
            commit: this.client.manager.commit,
            uuid:
              process.env.pm_id ??
              this.client.util.randInt(0, 65535).toString(),
          })
        )
      );
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(
            EventType.DISCOVERY_UPDATE,
            this.client.util.getDiscoverableGuilds()
          )
        )
      );
    } catch {}
    this.client.manager.ready = true;
    this.client.setReadyPresence();

    for (const [, command] of this.client.commandHandler.modules as Collection<
      string,
      Command
    >) {
      if (!command.requiresExperiment || !command.guilds.length) continue;
      const registered = await command.registerSlashCommand();
      if (registered && registered.length)
        this.client.getLogger("Commands").info(
          `Successfully registered locked command ${command.id} in ${registered.length} guild(s)`,
          registered
            .map((cmd) => cmd.guild?.name)
            .filter((n) => !!n)
            .join(", ")
        );
    }

    if (this.client.manager.id != 0)
      return this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(
            EventType.REFRESH_COMMANDS,
            this.client.util.getCommandsV2()
          )
        )
      );

    const appCommandsDirect = await this.client.req
      .applications(this.client.application.id)
      .commands.get<FireAPIApplicationCommand[]>({
        query: { with_localisations: true },
      })
      .catch(() => [] as FireAPIApplicationCommand[]);

    if (appCommandsDirect.length || process.env.NODE_ENV == "development") {
      let commands: FireAPIApplicationCommand[] = appCommandsDirect
        .filter((cmd) => cmd.type != ApplicationCommandType.ChatInput)
        .map((cmd) => ({
          id: cmd.id,
          name: cmd.name,
          type: cmd.type,
          default_permission: true,
          default_member_permissions: null,
          dm_permission: cmd.dm_permission,
          integration_types: cmd.integration_types,
          contexts: cmd.contexts,
        })) as FireAPIApplicationCommand[];

      for (const cmd of this.client.commandHandler.modules.values()) {
        if (
          cmd.enableSlashCommand &&
          !cmd.guilds?.length &&
          !cmd.requiresExperiment &&
          !cmd.parent &&
          appCommandsDirect.find((s) => s.name == cmd.id)
        )
          commands.push(
            cmd.getSlashCommandJSON(
              appCommandsDirect.find((s) => s.name == cmd.id).id
            )
          );
        else if (
          cmd.enableSlashCommand &&
          !cmd.guilds?.length &&
          !cmd.requiresExperiment &&
          !cmd.parent
        )
          commands.push(cmd.getSlashCommandJSON());
      }

      const updated = await this.client.req
        .applications(this.client.application.id)
        .commands.put<RESTPutAPIApplicationCommandsResult>({
          data: commands,
        })
        .catch((e: Error) => {
          this.client
            .getLogger("Commands")
            .error(`Failed to update slash commands\n${e.stack}`);
          return [] as RESTPutAPIApplicationCommandsResult;
        });
      if (updated && updated.length) {
        this.client
          .getLogger("Commands")
          .info(`Successfully bulk updated ${updated.length} slash commands`);
        for (const applicationCommand of updated.values()) {
          const command = this.client.getCommand(applicationCommand.name);
          if (command) {
            // Main Command
            command.slashId = applicationCommand.id;

            // Subcommands share the same id as the parent
            // so we'll just iterate over the subcommands
            // and set the slashId
            const subcommands = command.getSubcommands();
            for (const subcommand of subcommands.values())
              subcommand.slashId = applicationCommand.id;

            // Same goes for subcommands in groups
            const subcommandGroups = command.getSubcommandGroups();
            for (const subcommandGroup of subcommandGroups.values()) {
              subcommandGroup.slashId = applicationCommand.id;
              const groupSubcommands = subcommandGroup.getSubcommands();
              for (const groupSubcommand of groupSubcommands.values())
                groupSubcommand.slashId = applicationCommand.id;
            }
          }
        }
        this.client.manager.ws?.send(
          MessageUtil.encode(
            new Message(EventType.REFRESH_SLASH_COMMAND_IDS, {
              commands: this.client.commandHandler.modules.map((command) => ({
                id: command.id,
                slashId: command.slashId,
                slashIds: command.slashIds,
              })),
            })
          )
        );
      }
    }

    return this.client.manager.ws?.send(
      MessageUtil.encode(
        new Message(
          EventType.REFRESH_COMMANDS,
          this.client.util.getCommandsV2()
        )
      )
    );
  }
}
