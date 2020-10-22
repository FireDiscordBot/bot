import { Command } from "../../../lib/util/command";
import * as express from "express";

interface Category {
  id: number;
  name: string;
  commands: {
    name: string;
    description: string;
    usage: string;
    aliases: string;
  }[];
}

export function commandsRoute(req: express.Request, res: express.Response) {
  const client = req.app.client;
  const categories: Category[] = [];
  let categoryID = 0;

  client.commandHandler.categories
    .filter(
      (category) =>
        !!category.findKey(
          (command) =>
            command.category.id !== "Admin" &&
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
            command.category.id !== "Admin" &&
            !command.hidden
        )
        .map((command) => {
          const args = command.getArgumentsClean().join(" ");
          return {
            name: command.id,
            description: command.description(
              client.languages.modules.get("en-US")
            ),
            usage: `{prefix}${command.id} ${args}`.trim(),
            aliases: command.aliases.join(", "),
          };
        });

      if (category.commands.length > 0) {
        categories.push(category);
      }
    });

  res.json(categories);
}
