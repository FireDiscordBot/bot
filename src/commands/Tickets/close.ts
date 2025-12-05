import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  MessageActionRow,
  MessageButton,
  MessageOptions,
  SnowflakeUtil,
} from "discord.js";

export default class CloseTicket extends Command {
  constructor() {
    super("close", {
      description: (language: Language) =>
        language.get("CLOSE_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.SendMessages,
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
    if (
      !(
        message instanceof ApplicationCommandMessage
          ? message.channel.real
          : message.channel
      ).isThread() ||
      message.member.isModerator()
    ) {
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
        content: message.language.getError(
          (message instanceof ApplicationCommandMessage
            ? message.channel.real
            : message.channel
          ).isThread()
            ? "TICKET_WILL_CLOSE_THREAD"
            : "TICKET_WILL_CLOSE"
        ),
        ...buttonOptions,
      });
      const willClose = await this.getConfirmationPromise(
        buttonSnowflake
      ).catch(() => {});
      if (!willClose)
        return message instanceof ApplicationCommandMessage
          ? await message.edit(
              `${this.client.util.useEmoji("error")} ${message.language.get(
                "TICKET_CONFIRMATION_EXPIRED"
              )}`
            )
          : await message.error("ERROR_CONTACT_SUPPORT");
    }
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
