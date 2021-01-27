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
    if (!this.client.guildSettings.items.has(guild.id))
      await this.client.guildSettings.init(guild.id);

    // these make sure the collection exists,
    // doesn't fill with data unless premium
    await guild.loadInvites();
    await guild.loadVcRoles();
    await guild.loadInviteRoles();
    await guild.loadPersistedRoles();

    this.client.console.log(
      `[Guilds] Fire joined a new guild! ${guild.name} (${guild.id}) with ${guild.memberCount} members`
    );
  }
}
