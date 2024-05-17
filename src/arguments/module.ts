import { FireMessage } from "@fire/lib/extensions/message";
import { Module } from "@fire/lib/util/module";
import { ArgumentTypeCaster } from "discord-akairo";

export const moduleTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Module | null => message.client.getModule(phrase);
