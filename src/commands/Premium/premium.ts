import {
  PremiumData,
  SubscriptionStatus,
} from "@fire/lib/interfaces/premium";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { FireMessage } from "@fire/lib/extensions/message";
import { EventType } from "@fire/lib/ws/util/constants";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Message } from "@fire/lib/ws/Message";

export default class Premium extends Command {
  constructor() {
    super("premium", {
      description: (language: Language) =>
        language.get("PREMIUM_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      restrictTo: "guild",
      ephemeral: true,
    });
  }

  async exec(message: FireMessage) {
    const premiumInfo = await this.client.db
      .query("SELECT * FROM premium_stripe WHERE uid=$1;", [message.author.id])
      .first()
      .catch(() => {});

    if (!premiumInfo || !premiumInfo.get("uid"))
      return await message.error("PREMIUM_NO_SUBSCRIPTION");

    const limit = premiumInfo.get("serverlimit") as number;
    let current = (premiumInfo.get("guilds") || []) as string[];

    // checking for current allows the user to remove
    // their own premium after their subscription ends
    // if it wasn't done automatically
    if (!limit && !current.includes(message.guild.id))
      return await message.error("PREMIUM_LIMIT_ZERO");

    if (current.length >= limit && !current.includes(message.guild.id))
      return await message.error("PREMIUM_LIMIT_REACHED", current);

    if (this.client.util.premium.has(message.guild.id)) {
      const currentPremium = this.client.util.premium.get(message.guild.id);
      if (currentPremium.user != message.author.id)
        return await message.error("PREMIUM_MANAGED_OTHER");
    }

    if (
      !message.guild.settings.get("premium.trialeligible", true) &&
      premiumInfo.get("status") == "trialing" &&
      !current.includes(message.guild.id) // allow for removing premium if set during trial
    )
      return await message.error("PREMIUM_TRIAL_INELIGIBLE");

    if (current.includes(message.guild.id))
      current = current.filter((id) => id != message.guild.id);
    else current.push(message.guild.id);
    const updated = await this.client.db
      .query("UPDATE premium_stripe SET guilds=$1 WHERE uid=$2 RETURNING *;", [
        current.length ? current : null,
        message.author.id,
      ])
      .first()
      .catch(() => {});
    if (updated) {
      const syncData: PremiumData = {
        periodEnd: (updated.get("periodend") as number) * 1000,
        status: updated.get("status") as SubscriptionStatus,
        limit: updated.get("serverlimit") as 1 | 3 | 5,
        user: updated.get("uid") as string,
      };
      if (
        updated.get("status") == "trialing" &&
        message.guild.settings.get("premium.trialeligible")
      ) {
        this.client.console.warn(
          `[Premium] Setting trial eligibility for ${message.guild} due to subscription from ${message.author} in trial period`
        );
        message.guild.settings.set("premium.trialeligible", false);
      }
      if (current.includes(message.guild.id))
        this.client.util.premium.set(message.guild.id, syncData);
      else this.client.util.premium.delete(message.guild.id);
      this.sync(
        message.guild.id,
        syncData,
        current.includes(message.guild.id) ? "add" : "remove"
      );
      return await message.success("PREMIUM_GUILDS_UPDATED", current);
    } else return await message.error("PREMIUM_UPDATE_FAILED");
  }

  sync(
    guild: FireGuild | string,
    syncData: PremiumData,
    action: "add" | "remove"
  ) {
    const guildId = guild instanceof FireGuild ? guild.id : guild;
    this.client.manager.ws?.send(
      MessageUtil.encode(
        new Message(EventType.PREMIUM_SYNC, {
          [guildId]: { ...syncData, action },
        })
      )
    );
  }
}
