import { getAllCommands, getCommands } from "@fire/lib/util/commandutil";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { FireMessage } from "@fire/lib/extensions/message";
import { ClusterStats } from "@fire/lib/interfaces/stats";
import { EventType } from "@fire/lib/ws/util/constants";
import { Language } from "@fire/lib/util/language";
import { Listener } from "@fire/lib/util/listener";
import { Command } from "@fire/lib/util/command";
import { Message } from "@fire/lib/ws/Message";
import { Module } from "@fire/lib/util/module";
import { Argument } from "discord-akairo";
import { Permissions } from "discord.js";
import * as centra from "centra";

export default class Unload extends Command {
  constructor() {
    super("unload", {
      description: (language: Language) =>
        language.get("UNLOAD_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.ADD_REACTIONS],
      args: [
        {
          id: "module",
          type: Argument.union("command", "language", "listener", "module"),
          readableType: "command|language|listener|module",
          default: null,
          required: true,
        },
        {
          id: "broadcast",
          match: "flag",
          flag: "--broadcast",
          default: null,
        },
      ],
      ownerOnly: true,
      restrictTo: "all",
    });
  }

  async exec(
    message: FireMessage,
    args: {
      module?: Command | Language | Listener | Module;
      broadcast?: string;
    }
  ) {
    if (!args.module) return;
    try {
      if (this.client.manager.ws)
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.ADMIN_ACTION, {
              user: `${message.author} (${message.author.id})`,
              user_id: message.author.id,
              guild: message.guild
                ? `${message.guild} (${message.guild.id})`
                : "N/A",
              shard: message.shard.id,
              action: `${args.module.handler.classToHandle.name} ${args.module.id} was reloaded`,
            })
          )
        );
      if (args.broadcast) {
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.LOAD_MODULE, {
              name: args.module.id,
              type: args.module.handler.classToHandle.name,
              action: "unload",
            })
          )
        );
        return await message.react("📤");
      } else {
        args.module.remove();
        // check if only a single cluster is running and if so, sync commands with aether
        const stats = (await (
          await centra(
            process.env.REST_HOST
              ? `https://${process.env.REST_HOST}/v2/stats`
              : `http://127.0.0.1:${process.env.REST_PORT}/v2/stats`
          )
            .header("User-Agent", this.client.manager.ua)
            .send()
        )
          .json()
          .catch(() => {})) as ClusterStats[] | void;
        if (stats && stats.length == 1)
          this.client.manager.ws.send(
            MessageUtil.encode(
              new Message(EventType.REQUEST_COMMANDS, {
                id: this.client.manager.id,
                commands: getCommands(this.client),
                allCommands: getAllCommands(this.client),
              })
            )
          );
        return await message.success("SLASH_COMMAND_HANDLE_SUCCESS");
      }
    } catch {
      return await message.error("ERROR_CONTACT_SUPPORT");
    }
  }
}
