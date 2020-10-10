import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";

export default class PremiumInhibitor extends Inhibitor {
  constructor() {
    super("premium", {
      reason: "Command is for premium guilds only",
      priority: 5,
    });
  }

  exec(message: FireMessage) {
    if (message.util?.parsed?.command?.premium)
      return !this.client.util.premium.has(message.guild.id);
    return false;
  }

  async init() {
    this.client.util.premium = new Map();
    this.client.util.loadedData.premium = false;
    const premium = await this.client.db.query("SELECT * FROM premium;");
    for await (const row of premium) {
      this.client.util.premium.set(
        row.get("gid") as string,
        row.get("uid") as string
      );
    }
    this.client.util.loadedData.premium = true;
    this.client.console.log(
      `[Premium] Successfully loaded ${this.client.util.premium.size} premium guilds`
    );
  }
}
