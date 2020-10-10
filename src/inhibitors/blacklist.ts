import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";

export default class BlacklistInhibitor extends Inhibitor {
  constructor() {
    super("blacklist", {
      reason: "User is blacklisted from using Fire",
      priority: 10,
      type: "all",
    });
  }

  exec(message: FireMessage) {
    return (
      this.client.util.plonked.includes(message.author.id) &&
      !this.client.util.admins.includes(message.author.id)
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
