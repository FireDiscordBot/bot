import { ArgumentOptions, Command } from "../../../lib/util/command";
import { ResponseLocals } from "../interfaces";
import * as express from "express";

export async function allCommandsRoute(
  req: express.Request,
  res: express.Response
) {
  const locals: ResponseLocals = res.locals as ResponseLocals;
  let commands: {
    name: string;
    description: string;
    usage: string;
    aliases: string;
    category: string;
  }[] = [];
  locals.client.commandHandler.modules.forEach((command: Command) => {
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
    commands.push({
      name: command.id,
      description: command.description(
        locals.client.languages.modules.get("en-US")
      ),
      usage: `{prefix}${command.id} ${args.join(" ")}`.trim(),
      aliases: command.aliases.join(", "),
      category: command.category.toString(),
    });
  });
  res.status(200).json(commands);
}
