import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { Invite } from "discord.js";
import GuildCommand, { InviteWithGuildCounts } from "./server";

export default class InviteInfo extends Command {
  command: GuildCommand;
  constructor() {
    super("inviteinfo", {
      description: (language: Language) =>
        language.get("INVITEINFO_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "invite",
          type: "invite",
          description: (language: Language) =>
            language.get("INVITEINFO_ARGUMENT_INVITE_DESCRIPTION"),
          required: true,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(command: ApplicationCommandMessage, args: { invite: Invite }) {
    if (!this.command)
      this.command = this.client.getCommand("guild") as GuildCommand;
    if (!args.invite) return await command.error("INVITEINFO_NO_INVITE");
    if (!args.invite.guild)
      return await command.error("INVITEINFO_SERVERS_ONLY");
    // @ts-ignore
    args.invite.guild.memberCount = args.invite.memberCount;
    // @ts-ignore
    args.invite.guild.approximatePresenceCount = args.invite.presenceCount;
    const invite = args.invite as InviteWithGuildCounts;
    await this.command.run(command, {
      // @ts-ignore
      guild: invite,
    });
  }
}
