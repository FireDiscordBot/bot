import { Guild, Structures } from "discord.js";
import { Language } from "../util/language";
import { FireMember } from "./guildmember";
import { Fire } from "../Fire";

export class FireGuild extends Guild {
  client: Fire;
  owner: FireMember;
  language: Language;

  constructor(client: Fire, data: object) {
    super(client, data);
    this.language = client.getLanguage(
      client.settings.get(this.id, "utils.language", "en-US")
    );
  }

  isPublic() {
    return (
      !!this.client.settings.get(this.id, "utils.public", false) ||
      this.features.includes("DISCOVERABLE")
    );
  }

  getMember(name: string): FireMember | null {
    const username = name.split("#")[0];
    const member = this.members.cache.find(
      (member) =>
        member.toString().toLowerCase() == name.toLowerCase() ||
        member.displayName?.toLowerCase() == username.toLowerCase() ||
        member.user.username?.toLowerCase() == username.toLowerCase()
    );

    return member ? (member as FireMember) : null;
  }

  async fetchMember(name: string): Promise<FireMember | null> {
    const member = this.getMember(name);

    if (member) {
      return member;
    } else {
      const fetchedMembers = await this.members.fetch({
        user: this.members.cache.size ? [...this.members.cache.array()] : [],
        query: name,
        limit: 1,
      });

      return fetchedMembers.first() as FireMember | null;
    }
  }
}

Structures.extend("Guild", () => FireGuild);
