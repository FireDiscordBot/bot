import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { Listener } from "@fire/lib/util/listener";
import { DMChannel, GuildChannel, Invite, Role } from "discord.js";
import { inspect } from "util";

export default class CommandFinished extends Listener {
  constructor() {
    super("commandFinished", {
      emitter: "commandHandler",
      event: "commandFinished",
    });
  }

  async exec(
    message: FireMessage | ApplicationCommandMessage,
    command: Command,
    _: Record<string, unknown>,
    ret: unknown
  ) {
    const point = {
      measurement: "commands",
      tags: {
        type: "finish",
        command: command.id,
        cluster: this.client.manager.id.toString(),
        shard: message.shard.id.toString(),
        user_id: message.author.id, // easier to query tag
      },
      fields: {
        type: "finish",
        command: command.id,
        // TODO: possibly rename to "source" rather than guild?
        guild: message.source,
        user: `${message.author} (${message.author.id})`,
        message_id: message.id,
        return: "",
      },
    };
    try {
      if (ret instanceof FireMessage)
        point.fields.return = `FireMessage { guildId: '${ret.guildId}', channelId: '${ret.channelId}', id: '${ret.id}' }`;
      else if (ret instanceof ApplicationCommandMessage)
        point.fields.return = `ApplicationCommandMessage { guildId: '${
          ret.guildId
        }', channelId: '${ret.channelId}', id: '${
          ret.sourceMessage?.id || ret.id
        }' }`;
      else if (ret instanceof FireMember || ret instanceof FireUser)
        point.fields.return = `${ret.constructor.name} { id: '${ret.id}' }`;
      else if (ret instanceof GuildChannel)
        point.fields.return = `${ret.constructor.name} { guildId: '${ret.guildId}', id: '${ret.id}' }`;
      else if (ret instanceof DMChannel)
        point.fields.return = `DMChannel { recipientId: '${ret.recipient.id}', id: '${ret.id}' }`;
      else if (ret instanceof FireGuild)
        point.fields.return = `FireGuild { id: '${ret.id}' }`;
      else if (ret instanceof Role)
        point.fields.return = `Role { guildId: '${ret.guild.id}', id: '${ret.id}' }`;
      else if (ret instanceof Invite)
        point.fields.return = `Invite { guildId: '${ret.guild.id}', code: '${ret.code}' }`;
      else
        point.fields.return = inspect(ret, {
          showHidden: false,
          getters: true,
          depth: 0,
        });
    } catch {}
    this.client.writeToInflux([point]);

    if (!(message instanceof ApplicationCommandMessage) && message.channel) {
      const chance = this.client.util.randInt(0, 100);
      if (
        chance > 30 &&
        chance < 50 &&
        message.util?.parsed?.command?.id != "help" &&
        !message.util?.parsed?.command?.ownerOnly
      ) {
        const upsellEmbed = await this.client.util.getSlashUpsellEmbed(message);
        if (upsellEmbed)
          await message
            .reply({
              embeds: [upsellEmbed],
              allowedMentions: { repliedUser: true },
            })
            .catch(() => {});
      }
    }

    // member cache sweep ignores members with
    // an active command util so once the command
    // finishes, we can dispose of the command util
    this.client.commandHandler.commandUtils.delete(message.id);
  }
}
