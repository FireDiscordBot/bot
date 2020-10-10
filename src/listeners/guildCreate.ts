import { FireGuild } from "../../lib/extensions/guild";
import { Listener } from "../../lib/util/listener";

export default class GuildCreate extends Listener {
  constructor() {
    super("guildCreate", {
      emitter: "client",
      event: "guildCreate",
    });
  }

  async exec(guild: FireGuild) {
    if (!this.client.util.loadedData.premium)
      await this.client.util.sleep(5000);
    if (
      !this.client.util.premium.has(guild.id) &&
      this.client.config.premiumOnly
    )
      return await guild.leave();
  }
}
