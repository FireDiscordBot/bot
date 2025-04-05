import { Fire } from "@fire/lib/Fire";
import { Snowflake, Structures, TextChannel } from "discord.js";
import { RawGuildChannelData } from "discord.js/typings/rawDataTypes";
import { FireGuild } from "./guild";

interface LinkedLobbyData {
  application_id: Snowflake;
  lobby_id: Snowflake;
  linked_by: Snowflake;
  linked_at: string;
}

export class FireTextChannel extends TextChannel {
  declare guild: FireGuild;
  declare client: Fire;

  linkedLobby?: LinkedLobby;

  constructor(guild: FireGuild, data?: RawGuildChannelData) {
    super(guild, data);

    if ("linked_lobby" in data)
      this.linkedLobby = new LinkedLobby(
        this,
        data.linked_lobby as LinkedLobbyData
      );
  }
}

// this is temporary, purely to use in /server
// for displaying the number of linked channels
//
// i will implement it properly if/when it
// is documented
class LinkedLobby {
  applicationId: Snowflake;
  channel: FireTextChannel;
  linkedById: string;
  lobbyId: string;
  linkedAt: Date;

  constructor(channel: FireTextChannel, data: LinkedLobbyData) {
    this.channel = channel;
    this.applicationId = data.application_id;
    this.lobbyId = data.lobby_id;
    this.linkedById = data.linked_by;
    this.linkedAt = new Date(data.linked_at);
  }
}

Structures.extend("TextChannel", () => FireTextChannel);
