import { FireTextChannel} from "@fire/lib/extensions/textchannel";
import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class BroadcastEvalEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.BROADCAST_EVAL);
  }

  async run(data: { messageId: string; channelId: string }) {
    this.manager.client.console.warn(
      `[Event] Received eval request for /${data.channelId}/messages/${data.messageId}`
    );
    try {
      const channel = await this.manager.client.channels.fetch(data.channelId);
      if (channel.type != "text") return;
      const message = (
        await (channel as FireTextChannel).messages.fetch({
          around: data.messageId,
          limit: 1,
        })
      ).first();
      if (!this.manager.client.isOwner(message.author)) return;
      message.content = message.content.replace("--broadcast", ""); // We don't want an infinite loop so goodbye flag
      const handled = await this.manager.client.commandHandler.handle(message);
      if (!handled)
        this.manager.client.console.warn(`[Event] Broadcasted eval failed!`);
    } catch (e) {
      this.manager.sentry.captureException(e);
    }
  }
}
