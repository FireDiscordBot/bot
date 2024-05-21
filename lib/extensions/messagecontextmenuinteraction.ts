import { Fire } from "@fire/lib/Fire";
import { APIChannel } from "discord-api-types/v9";
import {
  GuildFeatures,
  MessageContextMenuInteraction as MessageContextMenuInteractionBase,
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
  authorizing_integration_owners: Record<string, Snowflake>;
};

export class MessageContextMenuInteraction extends MessageContextMenuInteractionBase {
  rawChannel: APIChannel;
  rawGuild: PartialGuild;
  authorizingIntegrationOwners: Snowflake[];

  constructor(client: Fire, data: RawInteractionDataWithExtras) {
    super(client, data);
    this.rawChannel = data.channel;
    this.rawGuild = data.guild;
    this.authorizingIntegrationOwners = Object.values(
      data.authorizing_integration_owners
    );
  }
}

Structures.extend(
  "MessageContextMenuInteraction",
  // @ts-ignore
  () => MessageContextMenuInteraction
);
