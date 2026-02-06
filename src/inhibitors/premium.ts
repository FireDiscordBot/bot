import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { SubscriptionStatus } from "@fire/lib/interfaces/premium";
import { Command } from "@fire/lib/util/command";
import { CouponType } from "@fire/lib/util/constants";
import { Inhibitor } from "@fire/lib/util/inhibitor";
import { Snowflake } from "discord-api-types/globals";
import { Collection } from "discord.js";

const paidStatuses = ["trialing", "active", "past_due"];
const hasPaid = (status: SubscriptionStatus) => paidStatuses.includes(status);

export default class Premium extends Inhibitor {
  constructor() {
    super("premium", {
      reason: "premium",
      type: "post",
      priority: 5,
    });
  }

  async exec(message: FireMessage, command: Command) {
    if (command?.premium) return message.guild ? !message.guild.premium : true;
    return false;
  }

  async init() {
    // we wait for raw ready as that is a point
    // where we can guarantee that everything we need
    // is already initialized (e.g. the db connection)
    await this.client.waitUntilRawReady();

    this.client.util.premium = new Collection();
    this.client.util.loadedData.premium = false;
    const premiumStripe = await this.client.db.query<{
      guilds: Snowflake[];
      periodend: Date;
      active: boolean;
      status: SubscriptionStatus;
      serverlimit: number;
      uid: Snowflake;
    }>("SELECT guilds, periodend FROM premium_stripe;");
    const now = new Date();
    for await (const row of premiumStripe) {
      const { guilds, periodend: expiry } = row;
      if (now > expiry) continue;
      if (guilds && guilds.length)
        for (const guild of guilds) {
          const instance = this.client.guilds.cache.get(guild) as FireGuild;
          if (
            row.status == "trialing" &&
            instance?.settings.get<boolean>("premium.trialeligible", true)
          ) {
            this.client
              .getLogger("Premium")
              .warn(
                `Setting trial eligibility for ${instance} due to subscription from ${row.uid} in trial period`
              );
            await instance.settings.set<boolean>(
              "premium.trialeligible",
              false,
              this.client.user
            );
          }
          if (row.active)
            this.client.util.premium.set(guild, {
              status: row.status,
              limit: row.serverlimit,
              user: row.uid,
              periodEnd: +expiry,
            });
        }
    }
    this.client.util.loadedData.premium = true;
    this.client
      .getLogger("Premium")
      .log(
        `Successfully loaded ${this.client.util.premium.size} premium guilds`
      );

    if (
      !(this.client.options.shards as number[]).includes(
        this.client.util.getShard(this.client.config.fireGuildId)
      ) ||
      process.env.NODE_ENV != "production"
    )
      return;

    let paidIds: Snowflake[] = [];
    let removeIds: Snowflake[] = [];
    for await (const entry of premiumStripe) {
      const uid = entry.uid;
      const status = entry.status;
      if (uid && hasPaid(status)) paidIds.push(uid);
      else if (uid) removeIds.push(uid);
    }

    this.client.once("ready", async () => {
      const fireGuild = this.client.guilds.cache.get(
        this.client.config.fireGuildId
      );
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
            !this.client.config.dev
          )
            await member.roles
              .remove(premiumRole, "premium is gone :crabrave:")
              .catch((e) => {
                this.client.sentry?.captureException(e, {
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
              .add(premiumRole, "wow member now has premium")
              .catch((e) => {
                this.client.sentry?.captureException(e, {
                  user: {
                    id: member.id,
                    username: member.user.toString(),
                  },
                });
              });
      }

      const membersWithSpecialCoupon = Object.entries(
        this.client.manager.state.userConfigs
      )
        .filter(([, config]) => "premium.coupon" in config)
        .map(([id]) => id);
      const couponMembers = (await fireGuild.members
        .fetch({ user: membersWithSpecialCoupon })
        .catch(() => {})) as Collection<Snowflake, FireMember>;
      if (couponMembers && couponMembers.size) {
        for (const [, member] of couponMembers) {
          const currentCoupon =
            member.settings.get<CouponType>("premium.coupon");
          const currentEligibility =
            this.client.util.getSpecialCouponEligibility(member);
          if (currentCoupon && !currentEligibility) {
            const deleted = await this.client.util.deleteSpecialCoupon(member);
            if (deleted.success == false)
              this.client.sentry.captureEvent({
                level: "error",
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
            const updated = await this.client.util.updateSpecialCoupon(member);
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
              this.client.sentry.captureEvent({
                level: "error",
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
    });
  }
}
