import { FireMember } from "../../../lib/extensions/guildmember";
import { EventType } from "../../../lib/ws/util/constants";
import { FireGuild } from "../../../lib/extensions/guild";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";
import { TextChannel } from "discord.js";

export default class Sk1erSpecsEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.SK1ER_SPECS);
  }

  async run(data: { success: boolean; user: string; message: string }) {
    const guild = this.manager.client.guilds.cache.get(
      "411619823445999637"
    ) as FireGuild;
    if (!guild) return;
    if (!data.success)
      return (this.manager.client.channels.cache.get(
        "411620555960352787"
      ) as TextChannel).send(data.message, {
        allowedMentions: { users: [data.user] },
      });
    else {
      const member = (await guild.members.fetch({
        user: data.user,
      })) as FireMember;
      if (!member) return;
      if (member.roles.cache.has("595626786549792793")) return;
      else await member.roles.add("595626786549792793", "Received Specs");
      return await (guild.channels.cache.get(
        "411620555960352787"
      ) as TextChannel).send(
        member.language.get("SK1ER_BETA_SUCCESS", member.toMention()),
        {
          allowedMentions: { users: [data.user] },
        }
      );
    }
  }
}
