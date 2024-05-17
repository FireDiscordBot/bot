import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMessage } from "@fire/lib/extensions/message";
import { SubscriptionStatus } from "@fire/lib/interfaces/premium";
import { Command } from "@fire/lib/util/command";
import { Inhibitor } from "@fire/lib/util/inhibitor";
import { Collection, Snowflake } from "discord.js";

const paidStatuses = ["trialing", "active", "past_due"];
const hasPaid = (status: SubscriptionStatus) => paidStatuses.includes(status);

export default class PremiumInhibitor extends Inhibitor {
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
    this.client.util.premium = new Collection();
    this.client.util.loadedData.premium = false;
    const premiumStripe = await this.client.db.query(
      "SELECT * FROM premium_stripe WHERE active=true;"
    );
    const now = new Date();
    for await (const row of premiumStripe) {
      const guilds = row.get("guilds") as Snowflake[];
      const expiry = row.get("periodend") as Date;
      if (now > expiry) continue;
      if (guilds && guilds.length)
        for (const guild of guilds) {
          const instance = this.client.guilds.cache.get(guild) as FireGuild;
          if (
            row.get("status") == "trialing" &&
            instance?.settings.get<boolean>("premium.trialeligible", true)
          ) {
            this.client.console.warn(
              `[Premium] Setting trial eligibility for ${instance} due to subscription from ${row.get(
                "uid"
              )} in trial period`
            );
            instance.settings.set<boolean>("premium.trialeligible", false);
          }
          this.client.util.premium.set(guild, {
            status: row.get("status") as SubscriptionStatus,
            limit: row.get("serverlimit") as 1 | 3 | 5,
            user: row.get("uid") as string,
            periodEnd: +expiry,
          });
        }
    }
    this.client.util.loadedData.premium = true;
    this.client.console.log(
      `[Premium] Successfully loaded ${this.client.util.premium.size} premium guilds`
    );

    if (
      !(this.client.options.shards as number[]).includes(
        this.client.util.getShard(this.client.config.fireguildId)
      ) ||
      process.env.NODE_ENV != "production"
    )
      return;

    let paidIds: Snowflake[] = [];
    let removeIds: Snowflake[] = [];
    for await (const entry of premiumStripe) {
      const uid = entry.get("uid") as Snowflake;
      const status = entry.get("status") as SubscriptionStatus;
      if (uid && hasPaid(status)) paidIds.push(uid);
      else if (uid) removeIds.push(uid);
    }

    this.client.once("ready", async () => {
      const guild = this.client.guilds.cache.get(
        this.client.config.fireguildId
      );
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
          !this.client.config.dev
        )
          await member.roles.remove(role, "premium is gone :crabrave:");
        else if (
          paidIds.includes(member.id) &&
          !member.roles.cache.has(role.id)
        )
          await member.roles.add(role, "wow member now has premium");
    });
  }
}
