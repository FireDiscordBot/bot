import { ClientUtil } from "discord-akairo";
import { Collection, Snowflake, GuildMember, User, Guild } from "discord.js";
import { Fire } from "../Fire";

export class Util extends ClientUtil {
  client: Fire;
  admins: string[];
  plonked: string[];
  constructor(client: Fire) {
    super(client);
    this.admins = JSON.parse(process.env.ADMINS); // Will probabl change this for a table in le database
    this.plonked = [];
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

  userToString(user: GuildMember | User) {
    // Will change to extension of guildmember/user soon
    if (user instanceof GuildMember)
      return `${user.user.username}#${user.user.discriminator}`;
    else return `${user.username}#${user.discriminator}`;
  }

  async blacklist(
    user: GuildMember | User,
    reason: string,
    permanent: boolean
  ) {
    try {
      if (this.client.util.plonked.includes(user.id))
        return await this.updateBlacklist(user, reason, permanent);
      else return await this.insertBlacklist(user, reason, permanent);
    } catch {
      return false;
    }
  }

  async unblacklist(user: GuildMember | User) {
    try {
      return await this.deleteBlacklist(user);
    } catch {
      return false;
    }
  }

  private async insertBlacklist(
    user: GuildMember | User,
    reason: string,
    permanent: boolean
  ) {
    const username =
      user instanceof GuildMember ? user.user.username : user.username;
    await this.client.db.query(
      'INSERT INTO blacklist ("user", uid, reason, perm) VALUES ($1, $2, $3, $4);',
      [username, user.id, reason, permanent]
    );
    this.client.util.plonked.push(user.id);
    this.client.console.warn(
      `[Blacklist] Successfully blacklisted ${this.userToString(user)}`
    );
    return true;
  }

  private async updateBlacklist(
    user: GuildMember | User,
    reason: string,
    permanent: boolean
  ) {
    const username =
      user instanceof GuildMember ? user.user.username : user.username;
    await this.client.db.query(
      "UPDATE blacklist user=$1, uid=$2, reason=$3, perm=$4 WHERE uid=$2;",
      [username, user.id, reason, permanent]
    );
    this.client.console.warn(
      `[Blacklist] Successfully updated blacklist for ${this.userToString(
        user
      )}`
    );
    return true;
  }

  private async deleteBlacklist(user: GuildMember | User) {
    await this.client.db.query("DELETE FROM blacklist WHERE uid=$1;", [
      user.id,
    ]);
    this.client.util.plonked = this.client.util.plonked.filter(
      (u) => u != user.id
    );
    this.client.console.warn(
      `[Blacklist] Successfully unblacklisted ${this.userToString(user)}`
    );
    return true;
  }
}
