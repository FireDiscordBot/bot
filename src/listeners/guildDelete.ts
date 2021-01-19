import { FireGuild } from "../../lib/extensions/guild";
import { Listener } from "../../lib/util/listener";

export default class GuildDelete extends Listener {
  constructor() {
    super("guildDelete", {
      emitter: "client",
      event: "guildDelete",
    });
  }

  async exec(guild: FireGuild) {
    const owner = this.client.users.fetch(guild.ownerID, false);
    this.client.console.log(
      `[Guilds] Fire left a guild! ${guild.name} (${guild.id}) with ${guild.memberCount} members owned by ${owner}`
    );
  }
}
