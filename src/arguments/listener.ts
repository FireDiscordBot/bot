import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";
import { ArgumentTypeCaster } from "discord-akairo";

export const listenerTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Listener | null => message.client.getListener(phrase);
