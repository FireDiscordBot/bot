import * as express from "express";

import { Command } from "../../../lib/util/command";

interface ResponseCommand {
  name: string;
  description: string;
  usage: string;
  aliases: string;
  category: string;
}

export function allCommandsRoute(req: express.Request, res: express.Response) {
  const client = req.app.client;
  const commands = client.commandHandler.modules
    .filter(
      (command: Command) =>
        !command.ownerOnly && command.category.id !== "Admin" && !command.hidden
    )
    .map((command: Command) => {
      const args = command.getArgumentsClean().join(" ");
      return {
        name: command.id,
        description: command.description(client.languages.modules.get("en-US")),
        usage: `{prefix}${command.id} ${args}`.trim(),
        aliases: command.aliases.join(", "),
        category: command.category.toString(),
      } as ResponseCommand;
    });

  res.json(commands);
}
