import { GenericAction } from "./GenericAction";
import { Constants, Presence } from "discord.js";

const { Events } = Constants;

// cache who?
export class PresenceUpdateAction extends GenericAction {
  handle(data: any) {
    const guild = this.client.guilds.cache.get(data.guild_id);
    if (!guild) return;

    const presenceData = Object.assign(data, { guild });
    const presence = new Presence(this.client, presenceData);

    if (this.client.listenerCount(Events.PRESENCE_UPDATE))
      this.client.emit(Events.PRESENCE_UPDATE, null, presence);
  }
}
