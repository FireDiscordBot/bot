import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Listener } from "@fire/lib/util/listener";
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
    args: Record<string, unknown>,
    ret: unknown
  ) {
    const point = {
      measurement: "commands",
      tags: {
        type: "finish",
        command: command.id,
        cluster: this.client.manager.id.toString(),
        shard: message.guild?.shardId.toString() ?? "0",
      },
      fields: {
        type: "finish",
        command: command.id,
        guild_id: message.guild ? message.guild.id : "N/A",
        guild: message.guild ? message.guild.name : "N/A",
        user_id: message.author.id,
        user: message.author.toString(),
        message_id: message.id,
        return: "",
      },
    };
    try {
      point.fields.return = inspect(ret, false, 0);
    } catch {}
    this.client.influx([point]);

    if (
      message instanceof ApplicationCommandMessage ||
      message.deleted ||
      !message.channel ||
      message.channel?.deleted
    )
      return;

    const chance = this.client.util.randInt(0, 100);
    if (
      chance > 30 &&
      chance < 50 &&
      message.util?.parsed?.command?.id != "help" &&
      !message.util?.parsed?.command?.ownerOnly
    ) {
      const upsellEmbed = await this.client.util.getSlashUpsellEmbed(message);
      if (upsellEmbed)
        return await message
          .reply({
            embeds: [upsellEmbed],
            allowedMentions: { repliedUser: true },
          })
          .catch(() => {});
    }

    // member cache sweep ignores members with
    // an active command util so once the command
    // finishes, we can dispose of the command util
    this.client.commandHandler.commandUtils.delete(message.id);
  }
}
