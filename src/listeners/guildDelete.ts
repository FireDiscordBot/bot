import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Listener } from "@fire/lib/util/listener";

export default class GuildDelete extends Listener {
  constructor() {
    super("guildDelete", {
      emitter: "client",
      event: "guildDelete",
    });
  }

  async exec(guild: FireGuild) {
    if (!this.client.readyAt) return;
    const owner = (await this.client.users
      .fetch(guild.ownerID, {
        cache: false,
      })
      .catch(() => {})) as FireUser;
    this.client.console.log(
      `[Guilds] Fire left a guild! ${guild.name} (${guild.id}) with ${
        guild.memberCount
      } members owned by ${owner ?? "an unknown user"} (${guild.ownerID})`
    );
  }
}
