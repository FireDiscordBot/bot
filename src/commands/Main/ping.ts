import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { MessageEmbed } from "discord.js";

export default class Ping extends Command {
  constructor() {
    super("ping", {
      description: (language: Language) =>
        language.get("PING_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    const embed = new MessageEmbed()
      .setTitle(
        `:ping_pong: ${this.client.restPing}ms.\n:heartpulse: ${
          this.client.ws.shards.get(command.guild ? command.guild.shardId : 0)
            .ping
        }ms.`
      )
      .setColor(command.member?.displayColor ?? "#FFFFFF")
      .setFooter(
        command.language.get("PING_FOOTER", {
          shard: command.guild ? command.guild.shardId : 0,
          cluster: this.client.manager.id,
        })
      )
      .setTimestamp();

    return await command.channel.send({ embeds: [embed] });
  }
}
