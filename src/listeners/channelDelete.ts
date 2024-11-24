import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";
import { Snowflake } from "discord-api-types/globals";
import { DMChannel, GuildChannel } from "discord.js";

export default class ChannelDelete extends Listener {
  constructor() {
    super("channelDelete", {
      emitter: "client",
      event: "channelDelete",
    });
  }

  async exec(channel: GuildChannel | DMChannel) {
    if (channel instanceof DMChannel) return;
    const guild = channel.guild as FireGuild;

    if (guild.ticketIds.includes(channel.id)) {
      const newTickets = guild.ticketIds.filter((c) => c != channel.id);
      if (newTickets.length)
        await guild.settings.set(
          "tickets.channels",
          newTickets,
          this.client.user
        );
      else await guild.settings.delete("tickets.channels", this.client.user);

      if (!channel.parent?.children.size) {
        const category = channel.parent;
        const isOriginal =
          guild.settings
            .get<Snowflake[]>("tickets.parent", [])
            ?.indexOf(category.id) == 0;
        if (!isOriginal)
          await channel.parent
            .delete(guild.language.get("TICKET_OVERFLOW_DELETE_REASON"))
            .then(async () => {
              const oldParents = guild.settings.get<Snowflake[]>(
                "tickets.parent",
                []
              );
              await guild.settings.set(
                "tickets.parent",
                oldParents.filter((id) => id != category.id),
                this.client.user
              );
            })
            .catch(() => {});
      }
    } else if (
      guild.settings
        .get<Snowflake[]>("tickets.parent", [])
        ?.includes(channel.id)
    ) {
      let parents = guild.settings.get<Snowflake[]>("tickets.parent", []);
      parents = parents.filter((c) => c != channel.id);
      if (parents.length)
        await guild.settings.set("tickets.parent", parents, this.client.user);
      else await guild.settings.delete("tickets.parent", this.client.user);
    }
  }
}
