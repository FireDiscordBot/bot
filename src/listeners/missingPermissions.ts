import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";
import { Command } from "@fire/lib/util/command";
import { PermissionString } from "discord.js";

export default class MissingPermissions extends Listener {
  constructor() {
    super("missingPermissions", {
      emitter: "commandHandler",
      event: "missingPermissions",
    });
  }

  async exec(
    message: FireMessage,
    command: Command,
    type: "client" | "user",
    missing: PermissionString[]
  ) {
    const cleanPermissions = missing
      .map((name) =>
        this.client.util.cleanPermissionName(name, message.language)
      )
      .filter((permission) => !!permission);

    if (type == "client")
      return await message
        .error("MISSING_PERMISSIONS_CLIENT", {
          permissions: cleanPermissions.join(", "),
          command: message.util?.parsed?.alias || command.id,
        })
        .catch(() => {});
    else if (type == "user")
      return await message
        .error("MISSING_PERMISSIONS_USER", {
          permissions: cleanPermissions.join(", "),
          command: message.util?.parsed?.alias || command.id,
        })
        .catch(() => {});
  }
}
