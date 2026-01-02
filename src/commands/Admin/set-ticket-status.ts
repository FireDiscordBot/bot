import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import * as centra from "centra";
import { Snowflake } from "discord-api-types/globals";

enum TicketStatus {
  OPEN = 2,
  PENDING = 3,
  RESOLVED = 4,
  CLOSED = 5,
  WAITING_ON_CUSTOMER = 6,
  WAITING_ON_THIRD_PARTY = 7,
}

type PartialTicketResponse = {
  total: number;
  results: {
    id: number;
    status: TicketStatus;
  }[];
};

export default class EssentialSetTicketStatus extends Command {
  constructor() {
    super("set-ticket-status", {
      description: "if you're not geek, ignore this command please thx",
      args: [
        {
          id: "status",
          // this could be just user but member allows username lookup
          type: "number",
          description: () =>
            "if you're not geek, ignore this command please thx",
          required: true,
          default: null,
          choices: [
            {
              name: "Open",
              value: TicketStatus.OPEN,
            },
            {
              name: "Pending",
              value: TicketStatus.PENDING,
            },
            {
              name: "Resolved",
              value: TicketStatus.RESOLVED,
            },
            {
              name: "Closed",
              value: TicketStatus.CLOSED,
            },
            {
              name: "Waiting on Customer",
              value: TicketStatus.WAITING_ON_CUSTOMER,
            },
            {
              name: "Waiting on Third Party",
              value: TicketStatus.WAITING_ON_THIRD_PARTY,
            },
          ],
        },
        {
          id: "channel",
          type: "string",
          description: () =>
            "if you're not geek, ignore this command please thx",
          match: "rest",
          required: false,
          default: null,
        },
      ],
      guilds: ["864592657572560958"],
      ownerOnly: true,
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { status: TicketStatus; channel?: Snowflake }
  ) {
    const { status, channel } = args;

    const ticketReq = await centra(
      "https://sparkuniverse.freshdesk.com/api/v2/search/tickets"
    )
      .header(
        "Authorization",
        // this is the most ridiculous thing I've ever seen
        Buffer.from(`${process.env.FRESHDESK_KEY}:lol`).toString("base64url")
      )
      .query("query", `"custom_string:'${channel ?? command.channelId}'"`)
      .send();
    const ticketResults = (await ticketReq.json()) as PartialTicketResponse;

    const ticket = ticketResults.results.at(0);
    if (!ticket) return await command.channel.send("no ticket found");

    const updateReq = await centra(
      `https://sparkuniverse.freshdesk.com/api/v2/tickets/${ticket.id}`,
      "PUT"
    )
      .header(
        "Authorization",
        Buffer.from(`${process.env.FRESHDESK_KEY}:lol`).toString("base64url")
      )
      .body({
        status,
        skip_close_notification: false,
      })
      .send();
    return await command.channel.send(
      `ticket update request status: ${updateReq.statusCode}`
    );
  }
}
