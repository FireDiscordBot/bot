import { TextChannel, Structures } from "discord.js";
import { FireGuild } from "./guild";
import { Fire } from "../Fire";

export class FireTextChannel extends TextChannel {
  guild: FireGuild;
  client: Fire;

  constructor(guild: FireGuild, data?: object) {
    super(guild, data);
  }
}

Structures.extend("TextChannel", () => FireTextChannel);
