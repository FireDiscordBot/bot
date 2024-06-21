import { FireGuild } from "@fire/lib/extensions/guild";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { ActionLogTypes, titleCase } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { DMChannel, GuildChannel, MessageEmbed, Snowflake } from "discord.js";

export default class ChannelDelete extends Listener {
  constructor() {
    super("channelDelete", {
      emitter: "client",
      event: "channelDelete",
    });
  }

  async exec(channel: GuildChannel | DMChannel) {
    if (channel instanceof DMChannel) return;
    const guild = channel.guild as FireGuild,
      language = guild.language;

    if (guild.ticketIds.includes(channel.id)) {
      const newTickets = guild.ticketIds.filter((c) => c != channel.id);
      if (newTickets.length) guild.settings.set("tickets.channels", newTickets);
      else guild.settings.delete("tickets.channels");

      if (!channel.parent?.children.size) {
        const category = channel.parent;
        const isOriginal =
          guild.settings
            .get<Snowflake[]>("tickets.parent", [])
            ?.indexOf(category.id) == 0;
        if (!isOriginal)
          await channel.parent
            .delete(guild.language.get("TICKET_OVERFLOW_DELETE_REASON"))
            .then(() => {
              const oldParents = guild.settings.get<Snowflake[]>(
                "tickets.parent",
                []
              );
              guild.settings.set(
                "tickets.parent",
                oldParents.filter((id) => id != category.id)
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
      if (parents.length) guild.settings.set("tickets.parent", parents);
      else guild.settings.delete("tickets.parent");
    }
  }
}
