import { Manager } from "@fire/lib/Manager";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord-api-types/globals";

export default class BroadcastEval extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.BROADCAST_EVAL);
  }

  async run(data: { messageId: Snowflake; channelId: Snowflake }) {
    this.console.warn(
      `Received eval request for /${data.channelId}/messages/${data.messageId}`
    );
    try {
      const channel = await this.manager.client.channels.fetch(data.channelId);
      if (channel.type != "GUILD_TEXT") return;
      const message = (
        await (channel as FireTextChannel).messages.fetch({
          around: data.messageId,
          limit: 1,
        })
      ).first() as FireMessage;
      if (!this.manager.client.isOwner(message.author)) return;
      message.content = message.content.replace("--broadcast", ""); // We don't want an infinite loop so goodbye flag
      const handled = await this.manager.client.commandHandler.handle(message);
      if (!handled) this.console.warn("Broadcasted eval failed!");
    } catch (e) {
      this.manager.sentry?.captureException(e);
    }
  }
}
