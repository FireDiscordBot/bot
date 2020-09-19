import { Structures, User } from "discord.js";
import { FireGuild } from "./guild";
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
}

Structures.extend("User", () => FireUser);
