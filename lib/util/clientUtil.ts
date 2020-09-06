import { ClientUtil } from "discord-akairo";
import { User } from "discord.js";
import { Guild } from "discord.js";
import { Snowflake } from "discord.js";
import { Collection } from "discord.js";
import { Fire } from "../Fire";

export class Util extends ClientUtil {
  client: Fire;
  constructor(client: Fire) {
    super(client);
  }

  async resolveOrFetchUser(
    text: string,
    users?: Collection<Snowflake, User>,
    guild?: Guild,
    caseSensitive: boolean = false,
    wholeWord: boolean = true
  ) {
    let user: User | null = null;
    if (text && text.match(/([0-9]{15,21})$/m))
      user = await this.client.users.fetch(text).catch(() => null);
    if (!user) {
      if (guild) {
        let member = guild.members.cache.find(
          (member) =>
            member.displayName?.toLowerCase() == text.toLowerCase() ||
            member.user.username?.toLowerCase() == text.toLowerCase()
        );
        if (member) return member.user;
      }
    } else
      return super.resolveUser(
        text,
        users || this.client.users.cache,
        caseSensitive,
        wholeWord
      );
    return user;
  }
}
