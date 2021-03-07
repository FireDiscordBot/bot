import { TextChannel, Structures } from "discord.js";
import { Fire } from "@fire/lib/Fire";
import { FireGuild } from "./guild";

export class FireTextChannel extends TextChannel {
  guild: FireGuild;
  client: Fire;

  constructor(guild: FireGuild, data?: object) {
    super(guild, data);
  }
}

Structures.extend("TextChannel", () => FireTextChannel);
