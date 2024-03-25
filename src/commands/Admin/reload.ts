import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { FireMessage } from "@fire/lib/extensions/message";
import { EventType } from "@fire/lib/ws/util/constants";
import { Language } from "@fire/lib/util/language";
import { Listener } from "@fire/lib/util/listener";
import { Command } from "@fire/lib/util/command";
import { Module } from "@fire/lib/util/module";
import { Message } from "@fire/lib/ws/Message";
import { Argument } from "discord-akairo";
import {
  ApplicationCommandOptionChoiceData,
  CacheType,
  CommandInteractionOption,
  Permissions,
} from "discord.js";
import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";

export default class AdminReload extends Command {
  constructor() {
    super("admin-reload", {
      description: (language: Language) =>
        language.get("ADMIN_RELOAD_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.ADD_REACTIONS],
      args: [
        {
          id: "module",
          type: Argument.union("command", "language", "listener", "module", [
            "*",
          ]),
          description: (language: Language) =>
            language.get("ADMIN_RELOAD_ARGUMENT_MODULE_DESCRIPTION"),
          readableType: "command|language|listener|module|*",
          autocomplete: true,
          required: true,
          default: null,
        },
        {
          id: "broadcast",
          match: "flag",
          flag: "--broadcast",
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      ownerOnly: true,
      slashOnly: true,
      parent: "admin",
    });
  }

  async autocomplete(
    interaction: ApplicationCommandMessage,
    focused: CommandInteractionOption<CacheType>
  ): Promise<string[] | ApplicationCommandOptionChoiceData[]> {
    if (!interaction.author.isSuperuser())
      return [
        {
          name: "you can't use this command, go away",
          value: "fuck off",
        },
      ];
    if (!focused.value)
      return [
        {
          name: "RELOAD ALL (avoid unless absolutely necessary)",
          value: "*",
        },
      ];
    const modules = [
      this.client.commandHandler.modules,
      this.client.languages.modules,
      this.client.listenerHandler.modules,
      this.client.modules.modules,
    ].flatMap((m) => m.map((o) => o));
    return modules
      .filter((module) =>
        module.id.toLowerCase().includes(focused.value.toString().toLowerCase())
      )
      .map((module) => ({
        name: `${module.handler.constructor.name.replace("Handler", "")} - ${
          module.id
        }`,
        value: module.id,
      }));
  }

  async exec(
    message: FireMessage,
    args: {
      module?: Command | Language | Listener | Module | "*";
      broadcast?: string;
    }
  ) {
    if (!args.module) return;
    if (args.module == "*") {
      if (this.client.manager.ws)
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.ADMIN_ACTION, {
              user: `${message.author} (${message.author.id})`,
              user_id: message.author.id,
              // TODO: possibly rename to "source" rather than guild?
              guild: message.source,
              shard: message.shard.id,
              action: `All commands/languages/listeners/modules were reloaded`,
            })
          )
        );
      try {
        if (args.broadcast) {
          this.client.manager.ws.send(
            MessageUtil.encode(
              new Message(EventType.LOAD_MODULE, {
                name: "*",
                type: "*",
                action: "reload",
              })
            )
          );
          return await message.react("🔁");
        } else {
          [
            this.client.commandHandler,
            this.client.languages,
            this.client.listenerHandler,
            this.client.modules,
          ].forEach((handler) => handler.reloadAll());
          return await message.success("SLASH_COMMAND_HANDLE_SUCCESS");
        }
      } catch {
        return await message.error("ERROR_CONTACT_SUPPORT");
      }
    }
    try {
      if (this.client.manager.ws)
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.ADMIN_ACTION, {
              user: `${message.author} (${message.author.id})`,
              user_id: message.author.id,
              // TODO: possibly rename to "source" rather than guild?
              guild: message.source,
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
              action: "reload",
            })
          )
        );
        return await message.react("🔁");
      } else {
        args.module.reload();
        return await message.success("SLASH_COMMAND_HANDLE_SUCCESS");
      }
    } catch {
      return await message.error("ERROR_CONTACT_SUPPORT");
    }
  }
}
