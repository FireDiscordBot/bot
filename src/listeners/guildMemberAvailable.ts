import { FireMember } from "../../lib/extensions/guildmember";
import GuildMemberUpdate from "./guildMemberUpdate";
import { Listener } from "../../lib/util/listener";

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
