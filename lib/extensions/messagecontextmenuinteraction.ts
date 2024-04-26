import { Fire } from "@fire/lib/Fire";
import { APIChannel } from "discord-api-types/v9";
import {
  GuildFeatures,
  MessageContextMenuInteraction,
  Snowflake,
  Structures,
} from "discord.js";
import { RawInteractionData } from "discord.js/typings/rawDataTypes";

type PartialGuild = {
  id: Snowflake;
  locale: string;
  features: GuildFeatures[];
};

type RawInteractionDataWithExtras = RawInteractionData & {
  channel: APIChannel;
  guild: PartialGuild;
};

export class FireMessageContextMenuInteraction extends MessageContextMenuInteraction {
  rawChannel: APIChannel;
  rawGuild: PartialGuild;

  constructor(client: Fire, data: RawInteractionDataWithExtras) {
    super(client, data);
    this.rawChannel = data.channel;
    this.rawGuild = data.guild;
  }
}

Structures.extend(
  "MessageContextMenuInteraction",
  // @ts-ignore
  () => FireMessageContextMenuInteraction
);
