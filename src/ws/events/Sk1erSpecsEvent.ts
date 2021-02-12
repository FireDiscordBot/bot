import { FireMember } from "@fire/lib/extensions/guildmember";
import { EventType } from "@fire/lib/ws/util/constants";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";
import { TextChannel } from "discord.js";

export default class Sk1erSpecsEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.SK1ER_SPECS);
  }

  async run(data: { success: boolean; user: string; message: string }) {
    const guild = this.manager.client.guilds.cache.get(
      "411619823445999637"
    ) as FireGuild;
    if (!guild) {
      this.manager.client.console.warn(
        `[Sk1er] Received specs for ${data.user} but guild is not cached`
      );
      return;
    }
    const member = (await guild.members
      .fetch({
        user: data.user,
      })
      .catch(() => {})) as FireMember;
    if (!member) return;
    if (!data.success) {
      try {
        return await member.send(data.message, {
          allowedMentions: { users: [data.user] },
        });
      } catch {
        return (this.manager.client.channels.cache.get(
          "411620555960352787"
        ) as TextChannel).send(data.message, {
          allowedMentions: { users: [data.user] },
        });
      }
    } else {
      this.manager.client.console.log(
        `[Sk1er] Giving Beta Testing role to ${data.user}`
      );
      if (member.roles.cache.has("595626786549792793")) return;
      else await member.roles.add("595626786549792793", "Received Specs");
      try {
        return await member.send(
          member.language.get("SK1ER_BETA_SUCCESS", member.user.toMention()),
          {
            allowedMentions: { users: [member.id] },
          }
        );
      } catch {
        return await (guild.channels.cache.get(
          "411620555960352787"
        ) as TextChannel).send(
          member.language.get("SK1ER_BETA_SUCCESS", member.toMention()),
          {
            allowedMentions: { users: [member.id] },
          }
        );
      }
    }
  }
}
