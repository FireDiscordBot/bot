import { FireMessage } from "../../lib/extensions/message";
import { ArgumentTypeCaster } from "discord-akairo";
import { Module } from "../../lib/util/module";

export const moduleTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Module | null => message.client.getModule(phrase);
