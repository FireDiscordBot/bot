import { ArgumentOptions, Command } from "../../../lib/util/command";
import { ResponseLocals } from "../interfaces";
import * as express from "express";

export function commandsRoute(
  req: express.Request,
  res: express.Response
) {
  const locals: ResponseLocals = res.locals as ResponseLocals;
  let categoryID = -1;
  let categories: {
    id: number;
    name: string;
    commands: {
      name: string;
      description: string;
      usage: string;
      aliases: string;
    }[];
  }[] = [];
  locals.client.commandHandler.categories.forEach((category) => {
    let data: {
      id: number;
      name: string;
      commands: {
        name: string;
        description: string;
        usage: string;
        aliases: string;
      }[];
    } = {
      id: ++categoryID,
      name: category.toString(),
      commands: [],
    };
    category.forEach((command: Command) => {
      if (
        command.ownerOnly ||
        command.category.toString() == "Admin" ||
        command.hidden
      )
        return;
      let args: string[] = [];
      if (command.args?.length)
        (command.args as ArgumentOptions[]).forEach((arg: ArgumentOptions) => {
          if (typeof arg.type == "function") return;
          if (!arg?.required) args.push(`[<${arg.type}>]`);
          else args.push(`<${arg.type}>`);
        });
      data.commands.push({
        name: command.id,
        description: command.description(
          locals.client.languages.modules.get("en-US")
        ),
        usage: `{prefix}${command.id} ${args.join(" ")}`.trim(),
        aliases: command.aliases.join(", "),
      });
    });
    if (data.commands.length) categories.push(data);
  });
  res.status(200).json(categories);
}
