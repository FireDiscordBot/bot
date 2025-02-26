import { Manager } from "@fire/lib/Manager";
import { Message } from "@fire/lib/ws/Message";
import { Event } from "@fire/lib/ws/event/Event";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";

type HTTPMethod = "get" | "post" | "delete" | "patch" | "put";
const methods = ["get", "post", "delete", "patch", "put"];

export default class APIRequest extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.API_REQUEST);
  }

  async run(
    data: {
      route: string;
      method: HTTPMethod;
      data?: object;
    },
    nonce: string
  ) {
    if (!methods.includes(data.method)) return;
    try {
      this.console.info(
        `Forwarding API request to ${data.method.toUpperCase()} /${data.route}`
      );
      const response = await this.manager.client
        .req(data.route)
        [data.method]({ data: data.data });
      if (response)
        return this.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.API_REQUEST, response, nonce)
          )
        );
    } catch (e) {
      this.console.warn(`Forwarded API request failed`);
      return this.manager.ws.send(
        MessageUtil.encode(new Message(EventType.API_REQUEST, null, nonce))
      );
    }
  }
}
