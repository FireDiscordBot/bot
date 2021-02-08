import {
  PremiumData,
  SubscriptionStatus,
} from "../../../lib/interfaces/premium";
import { EventType } from "../../../lib/ws/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";

const paidStatuses = ["trialing", "active", "past_due"];
const dataKeys = ["user", "limit", "status", "periodEnd", "action"];
const hasPaid = (status: SubscriptionStatus) => paidStatuses.includes(status);

export default class PremiumSyncEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.PREMIUM_SYNC);
  }

  async run(data: {
    [guild: string]: PremiumData & { action: "add" | "remove" };
  }) {
    const { client } = this.manager;
    for (const [guild, premium] of Object.entries(data))
      if (premium.action == "remove") client.util.premium.delete(guild);
      else if (dataKeys.every((key) => premium.hasOwnProperty(key)))
        client.util.premium.set(guild, {
          periodEnd: premium.periodEnd,
          status: premium.status,
          limit: premium.limit,
          user: premium.user,
        });

    // Premium role stuffs
    if (
      !(client.options.shards as number[]).includes(
        client.util.getShard(client.config.fireGuildId)
      )
    )
      return;

    const premiumStripeResult = await client.db
      .query("SELECT uid FROM premium_stripe;")
      .catch(() => {});
    if (!premiumStripeResult) return;

    let paidIds: string[] = [];
    let removeIds: string[] = [];
    for await (const entry of premiumStripeResult) {
      const uid = entry.get("uid") as string;
      const status = entry.get("status") as SubscriptionStatus;
      if (uid && hasPaid(status)) paidIds.push(uid);
      else if (uid) removeIds.push(uid);
    }

    const guild = client.guilds.cache.get(client.config.fireGuildId);
    const role = guild.roles.cache.get("564060922688176139");
    const members = await guild.members.fetch().catch(() => {});
    if (!members) return;
    for (const [, member] of members)
      if (member.roles.cache.has(role.id) && removeIds.includes(member.id))
        await member.roles.remove(role, "premium is gone :crabrave:");
      else if (paidIds.includes(member.id))
        await member.roles.add(role, "wow member now has premium");
  }
}
