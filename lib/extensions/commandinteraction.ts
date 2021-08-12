import {
  CommandInteraction as CommandInteractionBase,
  Structures,
} from "discord.js";
import { FireGuild } from "./guild";
import { Fire } from "../Fire";

export class CommandInteraction extends CommandInteractionBase {
  declare guild: FireGuild;
  declare client: Fire;
}

Structures.extend("CommandInteraction", () => CommandInteraction);
