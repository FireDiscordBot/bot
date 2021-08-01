import { RawGuildChannelData } from "discord.js/typings/rawDataTypes";
import { TextChannel, Structures } from "discord.js";
import { Fire } from "@fire/lib/Fire";
import { FireGuild } from "./guild";

export class FireTextChannel extends TextChannel {
  declare guild: FireGuild;
  declare client: Fire;

  constructor(guild: FireGuild, data?: RawGuildChannelData) {
    super(guild, data);
  }
}

Structures.extend("TextChannel", () => FireTextChannel);
