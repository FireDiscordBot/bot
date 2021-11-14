import {
  MessageActionRow,
  MessageButton,
  Permissions,
  ThreadChannel,
} from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { Command } from "@fire/lib/util/command";

export default class CommandBlocked extends Listener {
  constructor() {
    super("commandBlocked", {
      emitter: "commandHandler",
      event: "commandBlocked",
    });
  }

  async exec(message: FireMessage, command: Command, reason: string) {
    this.client.influx(
      [
        {
          measurement: "commands",
          tags: {
            type: "blocked",
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
            reason,
          },
        },
      ],
      {
        retentionPolicy: "day",
      }
    );

    if (message.channel instanceof ThreadChannel) {
      const checks = await this.client.commandHandler
        .preThreadChecks(message)
        .catch(() => {});
      if (!checks) return;
    }

    if (reason == "500")
      return await message.error("COMMAND_ERROR_500", {
        status: constants.url.fireStatus,
      });
    else if (reason == "slashonly") {
      if (!message.guildId)
        return await message.error("COMMAND_ERROR_SLASH_ONLY_UPSELL", {
          command: command.parent
            ? `/${command.parent} ${command.id.replace(
                command.parent + "-",
                ""
              )}`
            : `/${command.id}`,
        });
      const slashCommands = await this.client
        .requestSlashCommands(message.guild)
        .catch(() => {});
      const hasSlash =
        slashCommands &&
        !!slashCommands.applications.find(
          (app) => app.id == this.client.user.id
        );
      if (message.member?.permissions.has(Permissions.FLAGS.MANAGE_GUILD))
        if (hasSlash)
          return await message.error("COMMAND_ERROR_SLASH_ONLY_UPSELL", {
            command: command.parent
              ? `/${command.parent} ${command.id.replace(
                  command.parent + "-",
                  ""
                )}`
              : `/${command.id}`,
          });
        else
          return await message.error("COMMAND_ERROR_SLASH_ONLY_NOSLASH", {
            command: command.parent
              ? `/${command.parent} ${command.id.replace(
                  command.parent + "-",
                  ""
                )}`
              : `/${command.id}`,
            components: [
              new MessageActionRow().addComponents(
                new MessageButton()
                  .setStyle("LINK")
                  .setLabel(message.language.get("INVITE"))
                  .setURL(
                    this.client.config.commandsInvite(
                      this.client,
                      message.guild.id
                    )
                  )
              ),
            ],
          });
      else {
        if (hasSlash)
          return await message.error("COMMAND_ERROR_SLASH_ONLY_UPSELL", {
            command: command.parent
              ? `/${command.parent} ${command.id.replace(
                  command.parent + "-",
                  ""
                )}`
              : `/${command.id}`,
          });
        else
          return await message.error("COMMAND_ERROR_SLASH_ONLY_USER_NOSLASH", {
            command: command.parent
              ? `/${command.parent} ${command.id.replace(
                  command.parent + "-",
                  ""
                )}`
              : `/${command.id}`,
            components: [
              new MessageActionRow().addComponents(
                new MessageButton()
                  .setStyle("LINK")
                  .setLabel(message.language.get("INVITE"))
                  .setURL(
                    this.client.config.commandsInvite(
                      this.client,
                      message.guild?.id ?? ""
                    )
                  )
              ),
            ],
          });
      }
    } else if (reason == "owner")
      return await message.error("COMMAND_OWNER_ONLY");
    else if (reason == "superuser")
      return await message.error("COMMAND_SUPERUSER_ONLY");
    else if (reason == "moderator")
      return await message.error("COMMAND_MODERATOR_ONLY");
    else if (reason == "guild")
      return await message.error("COMMAND_GUILD_ONLY", {
        invite: this.client.config.inviteLink,
      });
    else if (reason == "premium")
      return await message.error("COMMAND_PREMIUM_GUILD_ONLY");
    else if (reason == "experimentlock")
      return await message.error("COMMAND_EXPERIMENT_REQUIRED");
    else if (reason == "accountage")
      return await message.error("COMMAND_ACCOUNT_TOO_YOUNG");
    else if (reason == "guildlock")
      return await message.error("COMMAND_GUILD_LOCKED");
    else if (reason == "cache")
      return await message.error("COMMAND_ERROR_CACHE");
  }
}
