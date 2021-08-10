import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";

export default class GuildCreate extends Listener {
  constructor() {
    super("guildCreate", {
      emitter: "client",
      event: "guildCreate",
    });
  }

  async exec(guild: FireGuild) {
    if (!this.client.guildSettings.items.has(guild.id))
      await this.client.guildSettings.init(guild.id);

    this.client.console.log(
      `[Guilds] Fire joined a new guild! ${guild.name} (${guild.id}) with ${guild.memberCount} members`
    );
  }
}
