import { Structures, Guild, Collection, Snowflake, User } from "discord.js";
import { Language } from "../util/language";
import { FireMember } from "./guildmember";
import { Fire } from "../Fire";

export class FireGuild extends Guild {
  client: Fire;
  language: Language;
  constructor(client: Fire, data: object) {
    super(client, data);
    this.language = client.languages.modules.get(
      client.settings.get(this.id, "utils.language", "en-US")
    ) as Language;
  }

  getMember(name: string): FireMember {
    const full = name;
    if (name.includes("#")) name = name.split("#")[0];
    const member = this.members.cache.find(
      (member: FireMember) =>
        member.toString().toLowerCase() == full.toLowerCase() ||
        member.displayName?.toLowerCase() == name.toLowerCase() ||
        member.user.username?.toLowerCase() == name.toLowerCase()
    );
    if (member) return member as FireMember;
    else return null;
  }

  async fetchMember(name: string): Promise<FireMember> {
    const full = name;
    if (name.includes("#")) name = name.split("#")[0];
    const member = this.members.cache.find(
      (member: FireMember) =>
        member.toString().toLowerCase() == full.toLowerCase() ||
        member.displayName?.toLowerCase() == name.toLowerCase() ||
        member.user.username?.toLowerCase() == name.toLowerCase()
    );
    if (member) return member as FireMember;
    else
      return (
        ((
          await this.members.fetch({
            user: this.members.cache.size
              ? [...this.members.cache.array()]
              : [],
            query: name,
            limit: 1,
          })
        ).first() as FireMember) || null
      );
  }
}

Structures.extend("Guild", () => FireGuild);
