import { Structures, Guild, Collection, Snowflake, User } from "discord.js";
import { Fire } from "../Fire";
import { Language } from "../util/language";

export class FireGuild extends Guild {
  client: Fire;
  language: Language;
  constructor(client: Fire, data: object) {
    super(client, data);
    this.language = client.languages.modules.get(
      client.settings.get(this.id, "utils.language", "en-US")
    ) as Language;
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
