import { FireMessage } from "@fire/lib/extensions/message";
import { ArgumentTypeCaster } from "discord-akairo";
import { Listener } from "@fire/lib/util/listener";

export const listenerTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Listener | null => message.client.getListener(phrase);
