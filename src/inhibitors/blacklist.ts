import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Inhibitor } from "@fire/lib/util/inhibitor";

export default class BlacklistInhibitor extends Inhibitor {
  constructor() {
    super("blacklist", {
      reason: "blacklist",
      priority: 10,
      type: "post",
    });
  }

  async exec(message: FireMessage, command?: Command) {
    return this.client.util.isBlacklisted(
      message.author.id,
      message.guild,
      command?.id
    );
  }

  async init() {
    this.client.util.plonked = [];
    this.client.util.loadedData.plonked = false;
    const plonked = await this.client.db.query("SELECT * FROM blacklist;");
    for await (const row of plonked) {
      this.client.util.plonked.push(row.get("uid") as string);
    }
    this.client.util.loadedData.plonked = true;
    this.client.console.log(
      `[Blacklist] Successfully loaded ${this.client.util.plonked.length} blacklisted users`
    );
  }
}
