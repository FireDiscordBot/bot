import { Fire } from "@fire/lib/Fire";
import { Structures, TextChannel } from "discord.js";
import { RawGuildChannelData } from "discord.js/typings/rawDataTypes";
import { FireGuild } from "./guild";

export class FireTextChannel extends TextChannel {
  declare guild: FireGuild;
  declare client: Fire;

  constructor(guild: FireGuild, data?: RawGuildChannelData) {
    super(guild, data);
  }
}

Structures.extend("TextChannel", () => FireTextChannel);
