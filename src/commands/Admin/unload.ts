import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { ClusterStats } from "@fire/lib/interfaces/stats";
import { Command } from "@fire/lib/util/command";
import { getAllCommands, getCommands } from "@fire/lib/util/commandutil";
import { Language } from "@fire/lib/util/language";
import { Listener } from "@fire/lib/util/listener";
import { Module } from "@fire/lib/util/module";
import { Message } from "@fire/lib/ws/Message";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import * as centra from "centra";
import { Argument } from "discord-akairo";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  ApplicationCommandOptionChoiceData,
  CacheType,
  CommandInteractionOption,
} from "discord.js";

export default class AdminUnload extends Command {
  constructor() {
    super("admin-unload", {
      description: (language: Language) =>
        language.get("ADMIN_UNLOAD_COMMAND_DESCRIPTION"),
      clientPermissions: [PermissionFlagsBits.AddReactions],
      args: [
        {
          id: "module",
          type: Argument.union("command", "language", "listener", "module"),
          description: (language: Language) =>
            language.get("ADMIN_UNLOAD_ARGUMENT_MODULE_DESCRIPTION"),
          readableType: "command|language|listener|module",
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
              action: "unload",
            })
          )
        );
        return await message.react("📤");
      } else {
        args.module.remove();
        if (this.client.manager.REST_HOST) {
          // check if only a single cluster is running and if so, sync commands with aether
          const stats = (await (
            await centra(
              `${this.client.manager.REST_HOST}/${this.client.manager.CURRENT_REST_VERSION}/stats`
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
        }
        return await message.success("SLASH_COMMAND_HANDLE_SUCCESS");
      }
    } catch {
      return await message.error("ERROR_CONTACT_SUPPORT");
    }
  }
}
