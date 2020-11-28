import { FireMember } from "../../lib/extensions/guildmember";
import { Listener } from "../../lib/util/listener";
import { TextChannel } from "discord.js";
import Sk1er from "../modules/sk1er";

export default class GuildMemberUpdate extends Listener {
  constructor() {
    super("guildMemberUpdate", {
      emitter: "client",
      event: "guildMemberUpdate",
    });
  }

  async exec(oldMember: FireMember, newMember: FireMember) {
    // Both of these will check permissions & whether
    // dehoist/decancer is enabled so no need for checks here
    await newMember.dehoist();
    await newMember.decancer();

    const sk1erModule = this.client.getModule("sk1er") as Sk1er;
    if (
      sk1erModule &&
      !newMember.partial &&
      newMember.guild.id == sk1erModule.guildId
    ) {
      let removed = false;
      if (!newMember.roles.cache.has("585534346551754755"))
        removed = await sk1erModule
          .removeNitroPerks(newMember)
          .catch(() => false);
      if (removed)
        (sk1erModule.guild.channels.cache.get(
          "411620457754787841"
        ) as TextChannel).send(
          newMember.language.get(
            "SK1ER_NITRO_PERKS_REMOVED",
            newMember.toMention()
          ),
          { allowedMentions: { users: [newMember.id] } }
        );
    }
  }
}
