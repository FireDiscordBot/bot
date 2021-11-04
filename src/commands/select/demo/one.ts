import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Role } from "discord.js";

export default class SelectDemoOne extends Command {
  constructor() {
    super("select-demo-one", {
      args: [],
      enableSlashCommand: false,
      parent: "select-demo",
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async exec(message: FireMessage) {
    const textPromise = new Promise((resolve) =>
      this.client.selectHandlers.set(`${message.author.id}:text`, resolve)
    );
    const sent = await message.channel.send(
      "Use the `/select text` command to select a string of text."
    );
    const text = await textPromise;
    const rolePromise = new Promise((resolve) =>
      this.client.selectHandlers.set(`${message.author.id}:role`, resolve)
    );
    await sent.edit(
      `Your selected the text "${text}", now use the \`/select discord role\` command to select a role.`
    );
    const role = (await rolePromise) as Role;
    return await sent.edit(
      `Your selected the text "${text}", and you selecteed the role ${role}.`
    );
  }
}
