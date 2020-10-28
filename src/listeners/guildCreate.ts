import Description from "../commands/Configuration/desc";
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
      await this.client.util.sleep(1000);
    if (
      !this.client.util.premium.has(guild.id) &&
      this.client.config.premiumOnly
    )
      return await guild.leave();
    if (!this.client.guildSettings.items.has(guild.id))
      await this.client.guildSettings.init(guild.id);
    await (this.client.getCommand("description") as Description)
      .setDesc(
        this.client.guilds.cache.get("564052798044504084") as FireGuild,
        `Fire is an open-source, multi-purpose bot with ${this.client.commandHandler.modules.size} commands and is used in ${this.client.guilds.cache.size} servers.`
      )
      .catch(() =>
        this.client.console.warn("Failed to update description for Fire guild.")
      );
    this.client.console.log(
      `Fire joined a new guild! ${guild.name} (${guild.id}) with ${guild.memberCount} members`
    );
    // TODO Add botlist guild count posting
  }
}
