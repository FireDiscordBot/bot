import { Manager } from "@fire/lib/Manager";
import { Message } from "@fire/lib/ws/Message";
import { Event } from "@fire/lib/ws/event/Event";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";

export default class AliasSync extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.REQUEST_STATS);
  }

  async run(_: unknown, nonce: string) {
    if (!this.manager.ws?.open) return;
    await this.manager.client.waitUntilRawReady();
    const stats = await this.manager.client.util.getClusterStats();
    this.manager.ws.send(
      MessageUtil.encode(new Message(EventType.SEND_STATS, stats, nonce))
    );
  }
}
