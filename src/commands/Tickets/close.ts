import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { SnowflakeUtil, MessageOptions, Permissions } from "discord.js";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { MessageActionRow } from "discord.js";
import { MessageButton } from "discord.js";

const { emojis } = constants;

export default class CloseTicket extends Command {
  constructor() {
    super("close", {
      description: (language: Language) =>
        language.get("CLOSE_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.MANAGE_CHANNELS,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.MANAGE_ROLES,
      ],
      args: [
        {
          id: "reason",
          type: "string",
          default: "No reason provided.",
          required: false,
        },
      ],
      enableSlashCommand: true,
      aliases: ["closeticket"],
      restrictTo: "guild",
      ephemeral: true,
      lock: "channel",
    });
  }

  async exec(message: FireMessage, args: { reason: string }) {
    if (!message.member) return; // how
    const buttonSnowflake = SnowflakeUtil.generate();
    const buttonOptions = {
      components: [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setStyle("DANGER")
            .setCustomId(buttonSnowflake)
            .setLabel(message.language.get("TICKET_CLOSE_BUTTON_TEXT"))
            .setEmoji("534174796938870792")
        ),
      ],
    } as MessageOptions & { split?: false };
    if (message.hasExperiment(1621199146, 1))
      await message.channel.send({
        content: `${emojis.error} ${message.language.get(
          "TICKET_WILL_CLOSE_BUTTON"
        )}`,
        ...buttonOptions,
      });
    else await message.error("TICKET_WILL_CLOSE");
    const willClose = await this.getConfirmationPromise(
      message,
      buttonSnowflake
    ).catch(() => {});
    if (!willClose)
      return message instanceof ApplicationCommandMessage
        ? await message.edit(
            `${emojis.error} ${message.language.get(
              "TICKET_CONFIRMATION_EXPIRED"
            )}`
          )
        : await message.error();
    const closure = await message.guild.closeTicket(
      message.channel as FireTextChannel,
      message.member,
      args.reason
    );
    if (closure == "forbidden")
      return await message.error("TICKET_CLOSE_FORBIDDEN");
    else if (closure == "nonticket")
      return await message.error("TICKET_NON_TICKET");
    else if (closure instanceof Error)
      return this.client.commandHandler.emit(
        "commandError",
        message,
        this,
        args,
        closure
      );
  }

  private getConfirmationPromise(message: FireMessage, customId: string) {
    return new Promise((resolve, reject) => {
      this.client.buttonHandlersOnce.set(customId, resolve);
      message.channel
        .awaitMessages({
          max: 1,
          time: 10000,
          errors: ["time"],
          filter: (m: FireMessage) =>
            m.content.toLowerCase().trim() == "close" &&
            m.author.id == message.author.id,
        })
        .then(resolve)
        .catch(reject);
    });
  }
}
