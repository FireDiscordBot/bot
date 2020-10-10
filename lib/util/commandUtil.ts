import {
  CommandUtil as AkairoUtil,
  ParsedComponentData as AkairoParsed,
} from "discord-akairo";
import { Command } from "./command";

export class CommandUtil extends AkairoUtil {
  parsed?: ParsedComponentData;
}

export interface ParsedComponentData extends AkairoParsed {
  command: Command;
}
