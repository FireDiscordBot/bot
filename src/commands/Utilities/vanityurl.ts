import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import VanityURLs from "@fire/src/modules/vanityurls";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { Invite } from "discord.js";

const deleteKeywords = ["remove", "delete", "true", "yeet", "disable"];
const validityRegex = /^[a-zA-Z0-9]{3,25}$/gim;

export default class VanityURL extends Command {
  module: VanityURLs;

  constructor() {
    super("vanityurl", {
      description: (language: Language) =>
        language.get("VANITYURL_COMMAND_DESCRIPTION"),
      clientPermissions: [PermissionFlagsBits.CreateInstantInvite],
      userPermissions: [PermissionFlagsBits.ManageGuild],
      args: [
        {
          id: "code",
          type: "string",
          slashCommandType: "code",
          readableType: "code|delete",
          required: false,
          default: null,
        },
        {
          id: "invite",
          type: "invite",
          required: false,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { code?: string; invite?: Invite }
  ) {
    if (!this.module)
      this.module = this.client.getModule("vanityurls") as VanityURLs;
    if (!args.code) {
      const current = await this.client.db
        .query("SELECT * FROM vanity WHERE gid=$1 LIMIT 1;", [command.guild.id])
        .first()
        .catch(() => {});
      if (!current) return await command.error("VANITYURL_CODE_REQUIRED");
      else
        return await command.channel.send({
          embeds: [
            await this.module.current(
              command.guild,
              current.get("code") as string,
              command.language
            ),
          ],
        });
    }

    if (deleteKeywords.includes(args.code)) {
      await this.module.delete(command.guild);
      return await command.success("VANITYURL_DELETED");
    }

    if (
      !validityRegex.test(args.code.trim()) &&
      !command.author.isSuperuser()
    ) {
      validityRegex.lastIndex = 0;
      return await command.error("VANITYURL_REGEX_FAIL");
    }
    validityRegex.lastIndex = 0;

    const exists = await this.module.getVanity(args.code).catch(() => true);
    if (
      exists &&
      ((typeof exists == "object" && exists.gid != command.guild.id) ||
        exists === true)
    )
      return await command.error("VANITYURL_ALREADY_EXISTS");

    let invite = args.invite;
    if (!invite) {
      if (
        command.guild.features.includes("VANITY_URL") &&
        command.guild.members.me.permissions.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        const vanity = await command.guild.fetchVanityData().catch(() => {});
        if (vanity) invite = await this.client.fetchInvite(vanity.code).catch();
      }

      const channel =
        command.guild.systemChannel || (command.realChannel as FireTextChannel);
      if (typeof channel.createInvite != "function")
        return await command.error("ERROR_CONTACT_SUPPORT");

      // this will be false if above failed
      if (!invite)
        invite = await channel
          .createInvite({
            unique: true,
            temporary: false,
            maxAge: 0,
            reason: command.guild.language.get(
              "VANITYURL_INVITE_CREATE_REASON"
            ) as string,
          })
          .catch();

      // if all that failed, return error
      if (!invite) return await command.error("VANITYURL_INVITE_FAILED");
    }

    const vanity = await this.module.create(command.guild, args.code, invite);
    if (!vanity) return await command.error("ERROR_CONTACT_SUPPORT");
    else if (vanity == "blacklisted")
      return await command.error("VANITYURL_BLACKLISTED");
    else
      return await command.success("VANITYURL_CREATED", {
        vanity: `https://${
          process.env.NODE_ENV == "production" ? "" : "test."
        }inv.wtf/${args.code}`,
      });
  }
}
