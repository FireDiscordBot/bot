import Description from "@fire/src/commands/Configuration/desc";
import { EventType } from "@fire/lib/ws/util/constants";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class UpdateFireDescriptionEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.UPDATE_FIRE_DESCRIPTION);
  }

  async run(data: { commands: number; guilds: number }) {
    const { commands, guilds } = data;
    const { client } = this.manager;

    if (
      !(client.options.shards as number[]).includes(
        client.util.getShard(client.config.fireGuildId)
      )
    )
      return;

    const guild = client.guilds.cache.get(
      client.config.fireGuildId
    ) as FireGuild;
    const command = client.getCommand("description") as Description;

    await command
      .setDesc(
        guild,
        `Fire is an open-source, multi-purpose bot with ${commands} commands in ${guilds} servers.`
      )
      .catch(() => {});
  }
}
