import { FireMember } from "../../lib/extensions/guildmember";
import { Listener } from "../../lib/util/listener";

export default class GuildMemberAdd extends Listener {
  constructor() {
    super("guildMemberAdd", {
      emitter: "client",
      event: "guildMemberAdd",
    });
  }

  async exec(member: FireMember) {
    // Both of these will check permissions & whether
    // dehoist/decancer is enabled so no need for checks here
    await member.dehoist();
    await member.decancer();
  }
}
