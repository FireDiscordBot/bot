import { EventType } from "../../../lib/ws/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";
import { TextChannel } from "discord.js";

export default class PlaywrightRequestEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.PLAYWRIGHT_REQUEST);
  }

  async run(data: {
    error?: string;
    screenshot: { type: string; data: number[] };
    channel_id: string;
    lang: string;
  }) {
    const channel = this.manager.client.channels.cache.get(
      data.channel_id
    ) as TextChannel;
    if (!channel) return;
    if (data.error)
      return await channel.send(
        this.manager.client
          .getLanguage(data.lang)
          ?.get(`GOOGLE_WS_ERROR_${data.error}`) ||
          "Something went terribly wrong!"
      );
    else if (data.screenshot) {
      const screenshot = Buffer.from(data.screenshot.data);
      await channel
        .send(null, {
          files: [{ attachment: screenshot, name: "google.jpeg" }],
        })
        .catch(() => {});
    }
  }
}
