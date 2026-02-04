import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Inhibitor } from "@fire/lib/util/inhibitor";
import { Snowflake } from "discord-api-types/globals";

export default class Blacklist extends Inhibitor {
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
    const plonked = await this.client.db.query<{
      uid: Snowflake;
    }>("SELECT uid FROM blacklist;");
    for await (const row of plonked) {
      this.client.util.plonked.push(row.uid);
    }
    this.client.util.loadedData.plonked = true;
    this.client
      .getLogger("Blacklist")
      .log(
        `Successfully loaded ${this.client.util.plonked.length} blacklisted users`
      );
  }
}
