import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  MessageActionRow,
  MessageButton,
  MessageOptions,
  SnowflakeUtil,
} from "discord.js";

const { emojis } = constants;

export default class CloseTicket extends Command {
  constructor() {
    super("close", {
      description: (language: Language) =>
        language.get("CLOSE_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageRoles,
      ],
      args: [
        {
          id: "reason",
          type: "string",
          default: null,
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
    await message.channel.send({
      content: message.language.getError("TICKET_WILL_CLOSE"),
      ...buttonOptions,
    });
    const willClose = await this.getConfirmationPromise(buttonSnowflake).catch(
      () => {}
    );
    if (!willClose)
      return message instanceof ApplicationCommandMessage
        ? await message.edit(
            `${emojis.error} ${message.language.get(
              "TICKET_CONFIRMATION_EXPIRED"
            )}`
          )
        : await message.error("ERROR_CONTACT_SUPPORT");
    const closure = await message.guild.closeTicket(
      message.channel as FireTextChannel,
      message.member,
      args.reason ??
        message.guild.language.get("MODERATOR_ACTION_DEFAULT_REASON")
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

  private getConfirmationPromise(customId: string) {
    return new Promise((resolve, reject) => {
      this.client.buttonHandlersOnce.set(customId, resolve);

      setTimeout(() => {
        if (this.client.buttonHandlersOnce.has(customId)) {
          this.client.buttonHandlersOnce.delete(customId);
          reject(false);
        }
      }, 30000);
    });
  }
}
