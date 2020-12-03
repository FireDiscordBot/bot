import Description from "../commands/Configuration/desc";
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
    await (this.client.getCommand("description") as Description)
      .setDesc(
        this.client.guilds.cache.get("564052798044504084") as FireGuild,
        `Fire is an open-source, multi-purpose bot with ${this.client.commandHandler.modules.size} commands and is used in ${this.client.guilds.cache.size} servers.`
      )
      .catch(() =>
        this.client.console.warn(
          "[Listener] Failed to update description for Fire guild."
        )
      );
    this.client.console.log(
      `Fire left a guild! ${guild.name} (${guild.id}) with ${guild.memberCount} members owned by ${guild.owner}`
    );
    // TODO Add botlist guild count posting
  }
}
