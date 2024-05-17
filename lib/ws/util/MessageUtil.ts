import { Payload } from "@fire/lib/interfaces/aether";
import { Message } from "@fire/lib/ws/Message";
import { deflateSync, inflateSync } from "zlib";

export class MessageUtil {
  static encode(message: Message) {
    const deflated = deflateSync(JSON.stringify(message), { level: 5 });
    return deflated.toString("base64");
  }

  static decode(message: string) {
    try {
      const inflated = inflateSync(Buffer.from(message, "base64"), {
        level: 5,
      })?.toString();
      if (!inflated) return null;
      else return JSON.parse(inflated) as Payload;
    } catch {
      return null;
    }
  }
}
