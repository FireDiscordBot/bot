import { SlashCommandMessage } from "@fire/lib/extensions/slashCommandMessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { EventType } from "@fire/lib/ws/util/constants";
import { constants } from "@fire/lib/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class PlaywrightRequestEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.PLAYWRIGHT_REQUEST);
  }

  async run(data: {
    screenshot: { type: "Buffer"; data: number[] };
    interaction?: { id: string; token: string };
    channel_id?: string;
    error?: string;
    lang: string;
  }) {
    let channel: FireTextChannel;
    if (data.interaction?.id) {
      const util = this.manager.client.commandHandler.commandUtils.find(
        (util) =>
          util.message instanceof SlashCommandMessage &&
          util.message.id == data.interaction.id
      );
      if (!util) return;
      channel = util.message.channel as FireTextChannel; // really it's a FakeChannel
    } else {
      channel = this.manager.client.channels.cache.get(
        data.channel_id
      ) as FireTextChannel;
    }
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
