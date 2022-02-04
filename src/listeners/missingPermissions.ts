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
    this.client.influx([
      {
        measurement: "commands",
        tags: {
          type: "permissions",
          command: command.id,
          cluster: this.client.manager.id.toString(),
          shard: message.guild?.shardId.toString() ?? "0",
          user_id: message.author.id, // easier to query tag
        },
        fields: {
          type: "permissions",
          command: command.id,
          missing_type: type,
          guild: message.guild ? `${message.guild.name} (${message.guildId})` : "N/A",
          user: `${message.author} (${message.author.id})`,
          message_id: message.id,
          missing: missing.join(", "),
          has:
            type == "client"
              ? message.guild?.me.permissions.toArray().join(", ") ?? ""
              : message.member?.permissions.toArray().join(", ") ?? "",
        },
      },
    ]);

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
