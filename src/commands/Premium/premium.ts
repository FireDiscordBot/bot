import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

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

    if (!limit) return await message.error("PREMIUM_LIMIT_ZERO");

    if (current.length >= limit && !current.includes(message.guild.id))
      return await message.error("PREMIUM_LIMIT_REACHED", current);

    if (this.client.util.premium.has(message.guild.id)) {
      const currentUser = this.client.util.premium.get(message.guild.id);
      if (currentUser != message.author.id)
        return await message.error("PREMIUM_MANAGED_OTHER");
    }

    if (current.includes(message.guild.id))
      current = current.filter((id) => id != message.guild.id);
    else current.push(message.guild.id);
    const updated = await this.client.db
      .query("UPDATE premium_stripe SET guilds=$1 WHERE uid=$2;", [
        current.length ? current : null,
        message.author.id,
      ])
      .catch(() => {});
    if (updated && updated.status.startsWith("UPDATE ")) {
      if (current.includes(message.guild.id))
        this.client.util.premium.set(message.guild.id, message.author.id);
      else this.client.util.premium.delete(message.guild.id);
      return await message.success("PREMIUM_GUILDS_UPDATED", current);
    } else return await message.error("PREMIUM_UPDATE_FAILED");
  }
}
