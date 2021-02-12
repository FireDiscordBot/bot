import { EventType } from "@fire/lib/ws/util/constants";
import { constants } from "@fire/lib/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";
import { TextChannel } from "discord.js";

export default class PlaywrightRequestEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.PLAYWRIGHT_REQUEST);
  }

  async run(data: {
    error?: string;
    screenshot: { type: "Buffer"; data: number[] };
    channel_id: string;
    lang: string;
  }) {
    const channel = this.manager.client.channels.cache.get(
      data.channel_id
    ) as TextChannel;
    if (!channel) return;
    if (data.error)
      return await channel.send(
        constants.emojis.error +
          this.manager.client
            .getLanguage(data.lang)
            ?.get(`PLAYWRIGHT_ERROR_${data.error.toUpperCase()}`) ||
          "Something went terribly wrong!"
      );
    else if (data.screenshot) {
      const screenshot = Buffer.from(data.screenshot.data);
      await channel
        .send(null, {
          files: [{ attachment: screenshot, name: "playwright.png" }],
        })
        .catch(() => {});
      delete data.screenshot;
    }
  }
}
