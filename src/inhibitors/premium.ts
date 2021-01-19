import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";
import { Command } from "../../lib/util/command";
import { Collection } from "discord.js";

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
