import { Structures, GuildMember } from "discord.js";
import { FireGuild } from "./guild";
import { Fire } from "../Fire";
import { FireUser } from "./user";

export class FireMember extends GuildMember {
  client: Fire;
  guild: FireGuild;
  user: FireUser;

  constructor(client: Fire, data: object, guild: FireGuild) {
    super(client, data, guild);
  }

  toString() {
    return `${this.user.username}#${this.user.discriminator}`;
  }

  toMention() {
    return super.toString();
  }
}

Structures.extend("GuildMember", () => FireMember);
