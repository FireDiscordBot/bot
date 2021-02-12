import { deflateSync, inflateSync } from "zlib";
import { Message } from "@fire/lib/ws/Message";

export class MessageUtil {
  static encode(message: Message) {
    const deflated = deflateSync(JSON.stringify(message), { level: 5 });
    return deflated.toString("base64");
  }

  static decode(message: string) {
    const inflated = inflateSync(Buffer.from(message, "base64"), {
      level: 5,
    }).toString();
    const parsed = JSON.parse(inflated);
    return new Message(parsed.t, parsed.d);
  }
}
