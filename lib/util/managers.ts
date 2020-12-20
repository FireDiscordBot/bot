import { GuildMemberManager } from "discord.js";
import { FireGuild } from "../extensions/guild";
import { UserManager } from "discord.js";
import { Fire } from "../Fire";

export class FireUserManager extends UserManager {
  constructor(client: Fire, iterable?: Iterable<any>) {
    super(client, iterable);
  }

  add(data: any, cache?: boolean) {
    const entry = this.holds ? new this.holds(this.client, data) : data;
    if (entry?.id == this.client.user?.id) super.add(data, true);
    return entry;
  }
}

export class FireMemberManager extends GuildMemberManager {
  constructor(guild: FireGuild, iterable?: Iterable<any>) {
    super(guild, iterable);
  }

  add(data: any, cache?: boolean) {
    const entry = this.holds
      ? new this.holds(this.client, data, this.guild)
      : data;
    if (entry?.id == this.guild.client.user?.id) super.add(data, true);
    return entry;
  }
}
