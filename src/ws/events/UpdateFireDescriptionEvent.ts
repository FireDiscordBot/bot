import { EventType } from "@fire/lib/ws/util/constants";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

/* "guess you could say
that code is
fire" - drew */
export default class UpdateFireDescriptionEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.UPDATE_FIRE_DESCRIPTION);
  }

  async run(data: { commands: number; guilds: number }) {
    if (process.env.NODE_ENV != "production") return;

    const { commands, guilds } = data;
    const { client } = this.manager;

    if (
      !(client.options.shards as number[]).includes(
        client.util.getShard(client.config.fireguildId)
      )
    )
      return;

    const guild = client.guilds.cache.get(
      client.config.fireguildId
    ) as FireGuild;
    await guild
      .edit({
        description: `Fire is an honestly quite incredible open-source, multi-purpose bot in ${guilds} servers with ${commands} commands. It has memes, moderation, utilities and more. You can learn more at https://getfire.bot/`,
      })
      .catch(() => {});
  }
}
