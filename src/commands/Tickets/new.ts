import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { BaseFakeChannel } from "@fire/lib/interfaces/misc";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { Snowflake } from "discord-api-types/globals";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { ThreadChannel } from "discord.js";

export default class NewTicket extends Command {
  constructor() {
    super("new", {
      description: (language: Language) =>
        language.get("NEW_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.EmbedLinks,
      ],
      restrictTo: "guild",
      args: [
        {
          id: "subject",
          type: "string",
          default: "No subject given",
          required: false,
        },
      ],
      enableSlashCommand: true,
      aliases: ["newticket"],
      ephemeral: true,
    });
  }

  async exec(message: FireMessage, args: { subject: string }) {
    if (!message.member) return; // how
    if (
      message.channel instanceof ThreadChannel ||
      (message.channel instanceof BaseFakeChannel &&
        message.channel.real instanceof ThreadChannel)
    )
      return await message.error("NEW_TICKET_THREAD");
    const parents = message.guild.settings.get<Snowflake[]>(
      "tickets.parent",
      []
    );
    if (
      message.guild.hasExperiment(1651882237, 1) &&
      parents.length &&
      !message.guild.members.me
        ?.permissionsIn(message.guild.channels.cache.get(parents[0]))
        ?.has(
          PermissionFlagsBits.ViewChannel |
            PermissionFlagsBits.SendMessages |
            PermissionFlagsBits.CreatePrivateThreads
        )
    )
      return this.client.commandHandler.emit(
        "missingPermissions",
        message,
        this,
        "client",
        message.guild.members.me
          ?.permissionsIn(message.guild.channels.cache.get(parents[0]))
          .missing(
            PermissionFlagsBits.ViewChannel |
              PermissionFlagsBits.SendMessages |
              PermissionFlagsBits.CreatePrivateThreads
          )
      );
    const creating = await message.send("NEW_TICKET_CREATING");
    const ticket = await message.guild
      .createTicket(
        message.member,
        args.subject,
        message.channel as FireTextChannel
      )
      .catch((e) => {
        this.client.sentry?.captureException(e, {
          extra: {
            guild: message.guild.id,
            author: message.author.id,
          },
        });
        return "error";
      });
    // how?
    if (ticket == "author" || ticket == "blacklisted") return;
    else if (ticket == "error")
      return await creating.edit(message.language.getError("NEW_TICKET_ERROR"));
    else if (ticket == "disabled")
      return await creating.edit(
        message.language.getError("NEW_TICKET_DISABLED")
      );
    else if (ticket == "limit")
      return await creating.edit(message.language.getError("NEW_TICKET_LIMIT"));
    else if (ticket == "lock")
      return await creating.edit(
        `${this.client.util.useEmoji("error")} ${message.language.get(
          "NEW_TICKET_LOCK",
          {
            limit: message.guild.settings.get<number>("tickets.limit", 1),
          }
        )}`
      );
    else if (ticket == "toggled")
      return await creating.edit(
        `${this.client.util.useEmoji("error")} ${message.language.get(
          "NEW_TICKET_TOGGLED",
          {
            message: message.guild.settings.get<string>("tickets.togglemsg"),
          }
        )}`
      );
    else if (ticket instanceof Error)
      return this.client.commandHandler.emit(
        "commandError",
        message,
        this,
        args,
        ticket
      );
    else if (
      ticket instanceof FireTextChannel ||
      ticket instanceof ThreadChannel
    )
      return await creating.edit(
        `${this.client.util.useEmoji("success")} ${message.language.get(
          "NEW_TICKET_CREATED",
          {
            channel: ticket.toString(),
          }
        )}`
      );
  }
}
