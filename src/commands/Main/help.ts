import { titleCase, constants } from "../../../lib/util/constants";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

const { categoryNames } = constants;

export default class Help extends Command {
  constructor() {
    super("help", {
      description: (language: Language) =>
        language.get("HELP_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
      aliases: ["helpme", "commands", "h"],
      args: [
        {
          id: "command",
          type: "command",
          default: null,
          required: false,
        },
      ],
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage, args: { command: Command }) {
    if (!args.command) return await this.sendHelp(message);
    else return await this.sendUsage(message, args.command);
  }

  async sendHelp(message: FireMessage) {
    let fields = [];
    categoryNames.forEach((name: string) => {
      if (
        name == "Admin" &&
        !this.client.util.admins.includes(message.author.id)
      )
        return;
      let category = this.client.commandHandler.categories.get(name);
      if (!category) return;
      let commands: string[] = [];
      category
        .filter(
          (command) =>
            (!message.guild ? command.channel != "guild" : true) &&
            !command.hidden &&
            !command.guilds?.includes(message.guild.id)
        )
        .forEach((command) => commands.push(`\`${command.id}\``));
      if (commands.length)
        fields.push({
          name: category.id,
          value: commands.join(", "),
          inline: false,
        });
    });
    const embed = {
      color: message.member?.displayColor || "#ffffff",
      author: {
        icon_url: this.client.user.displayAvatarURL({
          size: 2048,
          format: "png",
        }),
      },
      fields,
      footer: {
        text: message.language.get(
          "HELP_FOOTER",
          message.util.parsed.prefix.replace(
            this.client.user.toString(),
            `@${this.client.user.username} `
          ) || "$",
          this.client.manager.id
        ) as string,
      },
      timestamp: new Date(),
    };
    await message.channel.send({ embed });
  }

  async sendUsage(message: FireMessage, command: Command) {
    let permissions: string[] = [];
    ((command.userPermissions || []) as Array<string>).forEach(
      (perm: string) => {
        permissions.push(titleCase(perm.replace("_", " ")));
      }
    );
    let args: string[] = command.getArgumentsClean();
    const embed = {
      color: message.member?.displayColor || "#ffffff",
      title: titleCase(command.id),
      description: command.description(message.language),
      fields: [
        {
          name: "» Usage",
          value: `${message.util.parsed.prefix || "$"}${command.id} ${
            args?.join(" ") || ""
          }`,
          inline: false,
        },
      ],
      timestamp: new Date(),
    };
    if (permissions.length)
      embed.fields.push({
        name: "» Permission" + (permissions.length > 1 ? "s" : ""),
        value: permissions.join(", "),
        inline: false,
      });
    await message.channel.send({ embed });
  }
}
