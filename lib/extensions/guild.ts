import { Structures, Guild, Collection, Snowflake, User } from "discord.js";
import { Fire } from "../Fire";

export class FireGuild extends Guild {
  client: Fire;
  constructor(client: Fire, data: object) {
    super(client, data);
  }

  resolveOrFetchUser(
    text: string,
    users?: Collection<Snowflake, User>,
    caseSensitive: boolean = false,
    wholeWord: boolean = true
  ) {
    return this.client.util.resolveOrFetchUser(
      text,
      users,
      this,
      caseSensitive,
      wholeWord
    );
  }
}

Structures.extend("Guild", () => FireGuild);
