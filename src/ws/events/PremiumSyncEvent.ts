import { EventType } from "../../../lib/ws/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";

export default class PremiumSyncEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.PREMIUM_SYNC);
  }

  async run(data: {
    guilds: string[];
    user_id: string;
    action: "add" | "remove";
  }) {
    const { client } = this.manager;
    client.console.log(
      `[Event] Received premium sync request for user ${data.user_id}${
        data.guilds?.length ? " and guilds " + data.guilds?.join(", ") : ""
      } with action ${data.action}.`
    );
    for (const guild of data.guilds)
      if (data.action == "remove") client.util.premium.delete(guild);
      else client.util.premium.set(guild, data.user_id);

    // Premium role stuffs
    if (
      !(client.options.shards as number[]).includes(
        client.util.getShard(client.config.fireGuildId)
      )
    ) {
      client.console.info(
        `[Event] Successfully synced premium guilds for user ${data.user_id}`
      );
      return;
    }

    const userIds = [...client.util.premium.values()];
    const guild = client.guilds.cache.get(client.config.fireGuildId);
    const role = guild.roles.cache.get("564060922688176139");
    client.console.info(
      `[Event] Found ${userIds.length} premium users, fetching members and giving roles now...`
    );
    const members = await guild.members.fetch().catch(() => {});
    if (!members) return;
    for (const [, member] of members)
      if (member.roles.cache.has(role.id) && !userIds.includes(member.id))
        await member.roles.remove(role, "premium is gone :crabrave:");
      else if (userIds.includes(member.id))
        await member.roles.add(role, "wow member now has premium");
  }
}
