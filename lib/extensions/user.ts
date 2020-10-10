import { Structures, User } from "discord.js";
import { Fire } from "../Fire";

export class FireUser extends User {
  client: Fire;
  constructor(client: Fire, data: object) {
    super(client, data);
  }

  toString() {
    return `${this.username}#${this.discriminator}`;
  }

  toMention() {
    return super.toString();
  }

  async blacklist(reason: string, permanent: boolean) {
    return await this.client.util.blacklist(this, reason, permanent);
  }

  async unblacklist() {
    return await this.client.util.unblacklist(this);
  }
}

Structures.extend("User", () => FireUser);
