import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { MessageActionRow, MessageButton, ThreadChannel } from "discord.js";

export default class CommandBlocked extends Listener {
  constructor() {
    super("commandBlocked", {
      emitter: "commandHandler",
      event: "commandBlocked",
    });
  }

  async exec(message: FireMessage, command: Command, reason: string) {
    this.client.manager.writeToInflux([
      {
        measurement: "commands",
        tags: {
          type: "blocked",
          command: command.id,
          cluster: this.client.manager.id.toString(),
          shard: message.shard.toString(),
          user_id: message.author.id, // easier to query tag
        },
        fields: {
          type: "blocked",
          command: command.id,
          // TODO: possibly rename to "source" rather than guild?
          guild: message.source,
          user: `${message.author} (${message.author.id})`,
          message_id: message.id,
          reason,
        },
      },
    ]);

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
      const canInvite = message.member?.permissions.has(
        PermissionFlagsBits.ManageGuild
      );
      const mention = command.getSlashCommandMention(message.guild);
      if (mention == null)
        return await message.error("COMMAND_ERROR_SLASH_UNAVAILABLE_HERE");
      else if (mention.includes("null"))
        return await message.error("COMMAND_NOTICE_SLASH_NO_MENTION");
      return await message.error("COMMAND_ERROR_SLASH_ONLY_UPSELL", {
        command: command.getSlashCommandMention(message.guild),
        components: message.guild
          ? [
              new MessageActionRow().addComponents(
                new MessageButton()
                  .setStyle("LINK")
                  .setLabel(
                    message.language.get(
                      canInvite
                        ? "SLASH_COMMAND_INVITE_BUTTON"
                        : "SLASH_COMMAND_INVITE_BUTTON_NO_PERMISSIONS"
                    )
                  )
                  .setURL(
                    this.client.config.commandsInvite(
                      this.client,
                      message.guild?.id ?? ""
                    )
                  )
              ),
            ]
          : [],
      });
    } else if (reason == "owner") {
      if (command.id == "eval") {
        // @ts-ignore
        if (message instanceof ApplicationCommandMessage) message.flags = 64;
        return await message.channel.send({
          stickers: ["1428174486913552404"],
        });
      }
      return await message.error("COMMAND_OWNER_ONLY");
    } else if (reason == "superuser")
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
