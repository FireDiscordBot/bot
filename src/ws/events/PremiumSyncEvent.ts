import { Manager } from "@fire/lib/Manager";
import { FireGuild } from "@fire/lib/extensions/guild";
import { PremiumData, SubscriptionStatus } from "@fire/lib/interfaces/premium";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord.js";

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
    for (const [guild, premium] of Object.entries(data)) {
      const instance = client.guilds.cache.get(guild as Snowflake) as FireGuild;
      if (
        premium.status == "trialing" &&
        instance?.settings.get<boolean>("premium.trialeligible", true)
      ) {
        client.console.warn(
          `[Premium] Setting trial eligibility for ${instance} due to subscription from ${premium.user} in trial period`
        );
        instance.settings.set<boolean>("premium.trialeligible", false);
      }
      if (premium.action == "remove") client.util.premium.delete(guild);
      else if (dataKeys.every((key) => premium.hasOwnProperty(key)))
        client.util.premium.set(guild, {
          periodEnd: premium.periodEnd,
          status: premium.status,
          limit: premium.limit,
          user: premium.user,
        });
    }

    // Premium role stuffs
    if (
      !(client.options.shards as number[]).includes(
        client.util.getShard(client.config.fireguildId)
      ) ||
      process.env.NODE_ENV != "production"
    )
      return;

    const premiumStripeResult = await client.db
      .query("SELECT uid, status FROM premium_stripe;")
      .catch(() => {});
    if (!premiumStripeResult) return;

    let paidIds: Snowflake[] = [];
    let removeIds: Snowflake[] = [];
    for await (const entry of premiumStripeResult) {
      const uid = entry.get("uid") as Snowflake;
      const status = entry.get("status") as SubscriptionStatus;
      if (uid && hasPaid(status)) paidIds.push(uid);
      else if (uid) removeIds.push(uid);
    }

    const guild = client.guilds.cache.get(client.config.fireguildId);
    if (!guild) return;
    const role = guild.roles.cache.get("564060922688176139");
    if (!role) return;
    const members = await guild.members
      .fetch({ user: [...paidIds, ...removeIds] })
      .catch(() => {});
    if (!members || !members.size) return;
    for (const [, member] of members)
      if (
        member.roles.cache.has(role.id) &&
        removeIds.includes(member.id) &&
        !client.config.dev
      )
        await member.roles.remove(role, "premium is gone :crabrave:");
      else if (paidIds.includes(member.id) && !member.roles.cache.has(role.id))
        await member.roles.add(role, "wow member now has premium");
  }
}
