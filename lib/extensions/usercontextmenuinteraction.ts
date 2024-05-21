import { Fire } from "@fire/lib/Fire";
import {
  Snowflake,
  Structures,
  UserContextMenuInteraction as UserContextMenuInteractionBase,
} from "discord.js";

export class UserContextMenuInteraction extends UserContextMenuInteractionBase {
  authorizingIntegrationOwners: Snowflake[];

  constructor(client: Fire, data: any) {
    super(client, data);
    this.authorizingIntegrationOwners = Object.values(
      data.authorizing_integration_owners
    );
  }
}

Structures.extend(
  "UserContextMenuInteraction",
  // @ts-ignore
  () => UserContextMenuInteraction
);
