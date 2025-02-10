import { Fire } from "@fire/lib/Fire";
import {
  ParsedComponentData as AkairoParsed,
  CommandUtil as AkairoUtil,
} from "discord-akairo";
import { ApplicationCommandMessage } from "../extensions/appcommandmessage";
import { ContextCommandMessage } from "../extensions/contextcommandmessage";
import { FireMessage } from "../extensions/message";
import { Command } from "./command";
import { CommandHandler } from "./commandhandler";
import { Language } from "./language";

export class CommandUtil extends AkairoUtil {
  declare parsed?: ParsedComponentData;

  constructor(
    handler: CommandHandler,
    message: FireMessage | ApplicationCommandMessage | ContextCommandMessage
  ) {
    // SlashCommandMessage is compatible enough with Message to work here
    // @ts-ignore
    super(handler, message);
  }
}

export interface ParsedComponentData extends AkairoParsed {
  command: Command;
}

interface Category {
  id: number;
  name: string;
  commands: {
    name: string;
    description: string;
    usage: string;
    aliases: string;
    hidden: boolean;
  }[];
}

interface ResponseCommand {
  name: string;
  description: string;
  usage: string;
  aliases: string;
  hidden: boolean;
  category: string;
}

export const getCommands = (client: Fire) => {
  const categories: Category[] = [];
  let categoryID = 0;

  client.commandHandler
    .getCategories()
    .filter(
      (category) =>
        !!category.findKey(
          (command) =>
            command.category.id != "Admin" &&
            !command.hidden &&
            !command.ownerOnly
        )
    )
    .forEach((commandsCategory) => {
      const category: Category = {
        id: categoryID++,
        name: commandsCategory.id,
        commands: [],
      };

      category.commands = commandsCategory
        .filter(
          (command: Command) =>
            !command.ownerOnly &&
            command.category.id != "Admin" &&
            !command.hidden &&
            !command.group &&
            !command.guilds?.length
        )
        .map((command) => {
          const args = command.getArgumentsClean().join(" ");
          return {
            name: command.id,
            description:
              typeof command.description == "function"
                ? command.description(
                    client.languages.modules.get("en-US") as Language
                  )
                : command.description ?? "No Description Provided",
            usage: command.slashOnly
              ? `/${command.id} ${args}`.trim()
              : `{prefix}${command.id} ${args}`.trim(),
            aliases: command.slashOnly
              ? ""
              : command.aliases
                  .filter((alias) => alias != command.id)
                  .join(", "),
            hidden: command.hidden,
            parent: command.parent,
          };
        });

      if (category.commands.length > 0) {
        categories.push(category);
      }
    });

  return categories;
};

export const getAllCommands = (client: Fire) => {
  const commands = client.commandHandler.modules
    .filter(
      (command: Command) =>
        !command.ownerOnly && command.category.id != "Admin" && !command.hidden
    )
    .map((command: Command) => {
      const args = command.getArgumentsClean().join(" ");
      return {
        name: command.id,
        description:
          typeof command.description == "function"
            ? command.description(
                client.languages.modules.get("en-US") as Language
              )
            : command.description ?? "No Description Provided",
        usage: command.slashOnly
          ? `/${command.id} ${args}`.trim()
          : `{prefix}${command.id} ${args}`.trim(),
        aliases: command.slashOnly
          ? ""
          : command.aliases.filter((alias) => alias != command.id).join(", "),
        hidden: command.hidden,
        category: command.category.toString(),
        parent: command.parent,
      } as ResponseCommand;
    });

  return commands;
};
