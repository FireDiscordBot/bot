import { Manager } from "@fire/lib/Manager";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { PremiumData, SubscriptionStatus } from "@fire/lib/interfaces/premium";
import { CouponType } from "@fire/lib/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { Severity } from "@sentry/node";
import { Snowflake } from "discord-api-types/globals";
import { Collection } from "discord.js";

const paidStatuses = ["trialing", "active", "past_due"];
const dataKeys = ["user", "limit", "status", "periodEnd", "action"];
const hasPaid = (status: SubscriptionStatus) => paidStatuses.includes(status);

export default class PremiumSync extends Event {
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
        client
          .getLogger("Premium")
          .warn(
            `Setting trial eligibility for ${instance} due to subscription from ${premium.user} in trial period`
          );
        await instance.settings.set<boolean>(
          "premium.trialeligible",
          false,
          this.manager.client.user
        );
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
        client.util.getShard(client.config.fireGuildId)
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

    const fireGuild = client.guilds.cache.get(client.config.fireGuildId);
    if (!fireGuild) return;
    const premiumRole = fireGuild.roles.cache.get("564060922688176139");
    if (!premiumRole) return;
    const premiumMembers = await fireGuild.members
      .fetch({ user: [...paidIds, ...removeIds] })
      .catch(() => {});
    if (premiumMembers && premiumMembers.size) {
      for (const [, member] of premiumMembers)
        if (
          member.roles.cache.has(premiumRole.id) &&
          removeIds.includes(member.id) &&
          !client.config.dev
        )
          await member.roles.remove(premiumRole, "fire+ is gone").catch((e) => {
            this.manager.sentry.captureException(e, {
              user: {
                id: member.id,
                username: member.user.toString(),
              },
            });
          });
        else if (
          paidIds.includes(member.id) &&
          !member.roles.cache.has(premiumRole.id)
        )
          await member.roles
            .add(premiumRole, "wow member now has fire+")
            .catch((e) => {
              this.manager.sentry.captureException(e, {
                user: {
                  id: member.id,
                  username: member.user.toString(),
                },
              });
            });
    }

    const membersWithSpecialCoupon = Object.entries(
      this.manager.state.userConfigs
    )
      .filter(([, config]) => "premium.coupon" in config)
      .map(([id]) => id);
    const couponMembers = (await fireGuild.members
      .fetch({ user: membersWithSpecialCoupon })
      .catch(() => {})) as Collection<Snowflake, FireMember>;
    if (couponMembers && couponMembers.size) {
      for (const [, member] of couponMembers) {
        const currentCoupon = member.settings.get<CouponType>("premium.coupon");
        const currentEligibility =
          this.manager.client.util.getSpecialCouponEligibility(member);
        if (currentCoupon && !currentEligibility) {
          const deleted = await this.manager.client.util.deleteSpecialCoupon(
            member
          );
          if (deleted.success == false)
            this.manager.sentry.captureEvent({
              level: Severity.Error,
              message: "Failed to delete premium special coupon",
              user: {
                id: member.id,
                username: member.user.toString(),
              },
              tags: {
                couponType: member.settings.get<CouponType>("premium.coupon"),
                reason: deleted.reason,
              },
            });
        } else if (currentCoupon && currentCoupon != currentEligibility) {
          const updated = await this.manager.client.util.updateSpecialCoupon(
            member
          );
          if (updated.success)
            await member
              .send({
                content: member.language.get(
                  "reused" in updated
                    ? "DISCOUNT_UPDATED_REUSED"
                    : "DISCOUNT_UPDATED",
                  updated
                ),
              })
              .catch(() => {});
          else if (updated.success == false)
            this.manager.sentry.captureEvent({
              level: Severity.Error,
              message: "Failed to update premium special coupon",
              user: {
                id: member.id,
                username: member.user.toString(),
              },
              tags: {
                currentCouponType:
                  member.settings.get<CouponType>("premium.coupon"),
                newCouponType: currentEligibility,
                reason: updated.reason,
              },
            });
        }
      }
    }
  }
}
