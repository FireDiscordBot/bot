import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
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
          type: /^[\w-]{1,25}$/im,
          readableType: "invite",
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

  async run(
    command: ApplicationCommandMessage,
    args: { invite?: { match: RegExpMatchArray; matches: RegExpExecArray[] } }
  ) {
    if (!this.command)
      this.command = this.client.getCommand("guild") as GuildCommand;
    if (!args.invite?.match) return await command.error("INVITEINFO_NO_INVITE");
    const invite = (await this.client
      .fetchInvite(args.invite.match[0])
      .catch((e) => e)) as InviteWithGuildCounts | Error;
    if (invite instanceof Error)
      return await command.error("INVITEINFO_INVALID");
    if (!invite.guild) return await command.error("INVITEINFO_SERVERS_ONLY");
    // @ts-ignore
    invite.guild.memberCount = invite.memberCount;
    // @ts-ignore
    invite.guild.approximatePresenceCount = invite.presenceCount;
    await this.command.run(command, {
      // @ts-ignore
      guild: invite,
    });
  }
}
