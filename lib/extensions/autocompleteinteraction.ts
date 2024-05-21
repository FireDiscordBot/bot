import { Fire } from "@fire/lib/Fire";
import {
  AutocompleteInteraction as AutocompleteInteractionBase,
  Snowflake,
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
