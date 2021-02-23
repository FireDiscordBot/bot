import { SubscriptionStatus } from "@fire/lib/interfaces/premium";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Inhibitor } from "@fire/lib/util/inhibitor";
import { Command } from "@fire/lib/util/command";
import { Collection } from "discord.js";

const paidStatuses = ["trialing", "active", "past_due"];
const hasPaid = (status: SubscriptionStatus) => paidStatuses.includes(status);

export default class PremiumInhibitor extends Inhibitor {
  constructor() {
    super("premium", {
      reason: "premium",
      priority: 5,
    });
  }

  exec(message: FireMessage, command: Command) {
    if (command?.premium) return message.guild ? !message.guild.premium : true;
    return false;
  }

  async init() {
    this.client.util.premium = new Collection();
    this.client.util.loadedData.premium = false;
    const premium = await this.client.db.query("SELECT * FROM premium;");
    for await (const row of premium) {
      this.client.util.premium.set(row.get("gid") as string, {
        user: row.get("uid") as string,
        periodEnd: 3133641600, // nice
        status: "active",
        limit: 1, // could be more but likely not
      });
    }
    const premiumStripe = await this.client.db.query(
      "SELECT * FROM premium_stripe"
    );
    const now = new Date();
    for await (const row of premiumStripe) {
      const guilds = row.get("guilds") as string[];
      const expiry = new Date((row.get("periodend") as number) * 1000);
      if (now > expiry) continue;
      if (guilds && guilds.length)
        for (const guild of guilds) {
          const instance = this.client.guilds.cache.get(guild) as FireGuild;
          if (
            row.get("status") == "trialing" &&
            instance?.settings.get("premium.trialeligible", true)
          ) {
            this.client.console.warn(
              `[Premium] Setting trial eligibility for ${instance} due to subscription from ${row.get(
                "uid"
              )} in trial period`
            );
            instance.settings.set("premium.trialeligible", false);
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
        this.client.util.getShard(this.client.config.fireGuildId)
      )
    )
      return;

    let paidIds: string[] = [];
    let removeIds: string[] = [];
    for await (const entry of premiumStripe) {
      const uid = entry.get("uid") as string;
      const status = entry.get("status") as SubscriptionStatus;
      if (uid && hasPaid(status)) paidIds.push(uid);
      else if (uid) removeIds.push(uid);
    }

    this.client.once("ready", async () => {
      const guild = this.client.guilds.cache.get(
        this.client.config.fireGuildId
      );
      if (!guild) return;
      const role = guild.roles.cache.get("564060922688176139");
      const members = await guild.members.fetch().catch(() => {});
      if (!members) return;
      for (const [, member] of members)
        if (member.roles.cache.has(role.id) && removeIds.includes(member.id) && !this.client.config.dev)
          await member.roles.remove(role, "premium is gone :crabrave:");
        else if (paidIds.includes(member.id))
          await member.roles.add(role, "wow member now has premium");
    });
  }
}
