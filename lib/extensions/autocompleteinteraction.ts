import { Fire } from "@fire/lib/Fire";
import { Snowflake } from "discord-api-types/globals";
import {
  AutocompleteInteraction as AutocompleteInteractionBase,
  Structures,
} from "discord.js";

export class AutocompleteInteraction extends AutocompleteInteractionBase {
  authorizingIntegrationOwners: Snowflake[];

  constructor(client: Fire, data: any) {
    super(client, data);
    this.authorizingIntegrationOwners = Object.values(
      data.authorizing_integration_owners
    );
  }
}

Structures.extend(
  "AutocompleteInteraction",
  // @ts-ignore
  () => AutocompleteInteraction
);
