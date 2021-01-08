import { FireMember } from "../../lib/extensions/guildmember";
import { Listener } from "../../lib/util/listener";
import { TextChannel } from "discord.js";
import Sk1er from "../modules/sk1er";

export default class GuildMemberRemove extends Listener {
  constructor() {
    super("guildMemberRemove", {
      emitter: "client",
      event: "guildMemberRemove",
    });
  }

  async exec(member: FireMember) {
    const sk1erModule = this.client.getModule("sk1er") as Sk1er;
    if (sk1erModule && member.guild.id == sk1erModule.guildId) {
      const removed = await sk1erModule
        .removeNitroPerks(member)
        .catch(() => false);
      if (typeof removed == "boolean" && removed)
        (sk1erModule.guild.channels.cache.get(
          "411620457754787841"
        ) as TextChannel).send(
          sk1erModule.guild.language.get(
            "SK1ER_NITRO_PERKS_REMOVED_LEFT",
            member.toString()
          )
        );
    }

    const tickets = member.guild.tickets;
    for (const channel of tickets) {
      if (
        channel.topic.startsWith(
          member.guild.language.get(
            "TICKET_CHANNEL_TOPIC",
            member.toString(),
            member.id,
            null
          ) as string
        )
      )
        await channel.send(
          member.guild.language.get("TICKET_AUTHOR_LEFT", member.toString())
        );
    }
  }
}
