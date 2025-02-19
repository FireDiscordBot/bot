import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import VanityURLs from "@fire/src/modules/vanityurls";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { DiscordAPIError, Invite } from "discord.js";

const validityRegex = /^[a-zA-Z0-9]{3,25}$/gim;

export default class VanityCreate extends Command {
  module: VanityURLs;

  constructor() {
    super("vanity-create", {
      description: (language: Language) =>
        language.get("VANITY_CREATE_COMMAND_DESCRIPTION"),
      clientPermissions: [PermissionFlagsBits.CreateInstantInvite],
      userPermissions: [PermissionFlagsBits.ManageGuild],
      args: [
        {
          id: "code",
          type: "string",
          slashCommandType: "code",
          description: (language: Language) =>
            language.get("VANITY_CREATE_CODE_ARGUMENT_DESCRIPTION"),
          required: true,
          default: null,
        },
        {
          id: "invite",
          type: "invite",
          description: (language: Language) =>
            language.get("VANITY_CREATE_INVITE_ARGUMENT_DESCRIPTION"),
          required: false,
          default: null,
        },
      ],
      restrictTo: "guild",
      parent: "vanity",
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { code: string; invite?: Invite }
  ) {
    if (!this.module)
      this.module = this.client.getModule("vanityurls") as VanityURLs;

    if (this.module.isBlacklisted(command.guild))
      return await command.error("VANITY_CREATE_BLACKLISTED");

    if (
      !args.code ||
      (!validityRegex.test(args.code.trim()) && !command.author.isSuperuser())
    )
      return await command.error("VANITY_CREATE_CODE_INVALID");

    const exists = await this.module.getVanity(args.code).catch((e) => e);
    if (exists instanceof Error)
      return await command.error("VANITY_CREATE_CODE_INVALID");
    else if (exists && exists.gid == command.guildId)
      return await command.error("VANITY_CREATE_CODE_CURRENT", {
        deletecommand: this.client
          .getCommand("vanity")
          .getSlashCommandMention(
            command.guild,
            this.client.getCommand("vanity-delete")
          ),
      });

    const remaining = await this.module.getVanityLimitRemaining(
      command.member ?? command.author,
      command.guild
    );
    if (!remaining || remaining < 0)
      return await command.error(
        command.author.settings.has("stripe.addons.extra_vanity")
          ? "VANITY_CREATE_LIMIT_REACHED"
          : "VANITY_CREATE_ADDON_UPSELL"
      );

    let invite = args.invite;
    if (!invite) {
      if (command.guild.vanityURLCode) {
        const vanity = await command.guild.fetchVanityData().catch(() => {});
        if (vanity && vanity.code)
          invite = (await this.client
            .fetchInvite(vanity.code)
            .catch(() => {})) as Invite;
      }

      // will work if the fetch above fails
      if (!invite) {
        const channel =
          command.guild.systemChannel ||
          (command.realChannel as FireTextChannel);

        if (typeof channel.createInvite != "function")
          return await command.error("ERROR_CONTACT_SUPPORT");

        try {
          invite = await channel.createInvite({
            unique: true,
            temporary: false,
            maxAge: 0,
            reason: command.guild.language.get(
              "VANITY_CREATE_INVITE_CREATE_REASON"
            ) as string,
          });
        } catch (e) {
          // Special case for when the server has too many invites
          if (e instanceof DiscordAPIError && e.code == 30016)
            return await command.error("VANITY_CREATE_INVITE_SERVER_MAX");
        }

        // if all that failed, return error
        if (!invite) return await command.error("VANITY_CREATE_INVITE_FAILED");
      }

      if (invite.guild.id != command.guild.id)
        return await command.error("VANITY_CREATE_INVITE_WRONG_GUILD");

      const vanity = await this.module.create(
        command.guild,
        args.code,
        invite,
        command.member ?? command.author
      );
      if (!vanity) return await command.error("ERROR_CONTACT_SUPPORT");
      else if (vanity == "blacklisted")
        return await command.error("VANITY_CREATE_BLACKLISTED");
      else
        return await command.success("VANITY_CREATE_SUCCESS", {
          vanity: `${this.module.vanityDomain}/${args.code}`,
        });
    }
  }
}
