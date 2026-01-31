import { FireGuild } from "@fire/lib/extensions/guild";
import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord-api-types/globals";

interface LocalCacheTypes {
  inviteRoles: boolean;
  vcRoles: boolean;
}

export default class RefreshLocalCaches extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.REFRESH_LOCAL_CACHES);
  }

  async run(data: LocalCacheTypes & { id: Snowflake }) {
    const guild = this.manager.client.guilds.cache.get(data.id) as FireGuild;
    if (!guild) return;

    if (data.inviteRoles) await guild.loadInviteRoles();
    if (data.vcRoles) await guild.loadVcRoles();
  }
}
