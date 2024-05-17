import { FireMember } from "@fire/lib/extensions/guildmember";
import { Listener } from "@fire/lib/util/listener";
import GuildMemberUpdate from "./guildMemberUpdate";

export default class GuildMemberAvailable extends Listener {
  constructor() {
    super("guildMemberAvailable", {
      emitter: "client",
      event: "guildMemberAvailable",
    });
  }

  async exec(member: FireMember) {
    await (this.client.getListener("guildMemberUpdate") as GuildMemberUpdate)
      .exec(null, member)
      .catch(() => {});
  }
}
