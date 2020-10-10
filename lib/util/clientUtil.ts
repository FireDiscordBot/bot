import { FireMessage } from "../extensions/message";
import { GuildMember, User } from "discord.js";
import { ClientUtil } from "discord-akairo";
import { Fire } from "../Fire";

export class Util extends ClientUtil {
  client: Fire;
  admins: string[];
  plonked: string[];

  constructor(client: Fire) {
    super(client);
    this.admins = JSON.parse(process.env.ADMINS); // Will probably change this for a table in le database
    this.plonked = [];
  }

  async blacklist(
    user: GuildMember | User,
    reason: string,
    permanent: boolean
  ) {
    try {
      if (this.client.util.plonked.includes(user.id))
        await this.updateBlacklist(user, reason, permanent);
      else await this.insertBlacklist(user, reason, permanent);
      return true;
    } catch {
      return false;
    }
  }

  async unblacklist(user: GuildMember | User) {
    try {
      await this.deleteBlacklist(user);
      return true;
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
    this.client.console.warn(`[Blacklist] Successfully blacklisted ${user}`);
  }

  private async updateBlacklist(
    user: GuildMember | User,
    reason: string,
    permanent: boolean
  ) {
    const username =
      user instanceof GuildMember ? user.user.username : user.username;
    await this.client.db.query(
      "UPDATE blacklist user=$1, reason=$2, perm=$3 WHERE uid=$4;",
      [username, reason, permanent, user.id]
    );
    this.client.console.warn(
      `[Blacklist] Successfully updated blacklist for ${user}`
    );
  }

  private async deleteBlacklist(user: GuildMember | User) {
    await this.client.db.query("DELETE FROM blacklist WHERE uid=$1;", [
      user.id,
    ]);
    this.client.util.plonked = this.client.util.plonked.filter(
      (u) => u != user.id
    );
    this.client.console.warn(`[Blacklist] Successfully unblacklisted ${user}`);
  }

  static greedyArg = (
    converter: (message: FireMessage, phrase: string, silent?: boolean) => any
  ) => {
    return async (message: FireMessage, phrase: string) => {
      let converted: any[] = [];
      let splitPhrase: string[];
      if (phrase.includes(","))
        splitPhrase = phrase.replace(", ", ",").split(",");
      else splitPhrase = phrase.split(" ");
      const converters = async () => {
        splitPhrase.forEach(async (phrase) => {
          const result = await converter(message, phrase.trim(), true);
          if (result) converted.push(result);
        });
      };
      await converters(); // Ensures everything gets converted before returning
      return converted.length ? converted : null;
    };
  };
}
