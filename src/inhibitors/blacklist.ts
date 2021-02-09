import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";
import { Command } from "../../lib/util/command";

export default class BlacklistInhibitor extends Inhibitor {
  constructor() {
    super("blacklist", {
      reason: "blacklist",
      priority: 10,
      type: "all",
    });
  }

  exec(message: FireMessage, command?: Command) {
    return (
      (this.client.util.plonked.includes(message.author.id) ||
        (message.guild?.settings.get("utils.plonked", []) as string[]).includes(
          message.author.id
        )) &&
      !message.author.isSuperuser() &&
      command?.id != "debug"
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
