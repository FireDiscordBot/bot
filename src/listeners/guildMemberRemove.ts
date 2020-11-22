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
      let removed = false;
      removed = await sk1erModule.removeNitroPerks(member).catch(() => false);
      if (removed)
        (sk1erModule.guild.channels.cache.get(
          "411620457754787841"
        ) as TextChannel).send(
          member.language.get(
            "SK1ER_NITRO_PERKS_REMOVED_LEFT",
            member.toString()
          )
        );
    }
  }
}
