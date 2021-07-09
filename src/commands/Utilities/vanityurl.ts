import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import VanityURLs from "@fire/src/modules/vanityurls";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions, Invite } from "discord.js";

const deleteKeywords = ["remove", "delete", "true", "yeet", "disable"];
const validityRegex = /[a-zA-Z0-9]{3,25}/gim;

export default class VanityURL extends Command {
  module: VanityURLs;

  constructor() {
    super("vanityurl", {
      description: (language: Language) =>
        language.get("VANITYURL_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.CREATE_INSTANT_INVITE],
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
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
    });
  }

  async exec(message: FireMessage, args: { code?: string; invite?: Invite }) {
    if (!this.module)
      this.module = this.client.getModule("vanityurls") as VanityURLs;
    if (!args.code) {
      const current = await this.client.db
        .query("SELECT * FROM vanity WHERE gid=$1 LIMIT 1;", [message.guild.id])
        .first()
        .catch(() => {});
      if (!current) return await message.error("VANITYURL_CODE_REQUIRED");
      else
        return await message.channel.send({
          embeds: [
            await this.module.current(
              message.guild,
              current.get("code") as string,
              message.language
            ),
          ],
        });
    }

    if (deleteKeywords.includes(args.code)) {
      await this.module.delete(message.guild);
      return await message.success();
    }

    if (!validityRegex.test(args.code) && !message.author.isSuperuser()) {
      validityRegex.lastIndex = 0;
      return await message.error("VANITYURL_REGEX_FAIL");
    }
    validityRegex.lastIndex = 0;

    const exists = await this.module.getVanity(args.code).catch(() => true);
    if (
      exists &&
      ((typeof exists == "object" && exists.gid != message.guild.id) ||
        exists === true)
    )
      return await message.error("VANITYURL_ALREADY_EXISTS");

    let invite = args.invite;
    if (!invite) {
      if (
        message.guild.features.includes("VANITY_URL") &&
        message.guild.me.permissions.has(Permissions.FLAGS.MANAGE_GUILD)
      ) {
        if (message.guild.vanityURLCode)
          invite = await this.client
            .fetchInvite(message.guild.vanityURLCode)
            .catch();
        else {
          const vanity = await message.guild.fetchVanityData().catch(() => {});
          if (vanity)
            invite = await this.client.fetchInvite(vanity.code).catch();
        }
      }

      const channel =
        message.guild.systemChannel || (message.channel as FireTextChannel);
      if (typeof channel.createInvite != "function")
        return await message.error();

      // this will be false if above failed
      if (!invite)
        invite = await channel
          .createInvite({
            unique: true,
            temporary: false,
            maxAge: 0,
            reason: message.guild.language.get(
              "VANITYURL_INVITE_CREATE_REASON"
            ) as string,
          })
          .catch();

      // if all that failed, return error
      if (!invite) return await message.error("VANITYURL_INVITE_FAILED");
    }

    const vanity = await this.module.create(message.guild, args.code, invite);
    if (!vanity) return await message.error();
    else if (vanity == "blacklisted")
      return await message.error("VANITYURL_BLACKLISTED");
    else
      return await message.success("VANITYURL_CREATED", {
        vanity: `https://${
          process.env.NODE_ENV == "production" ? "" : "test."
        }inv.wtf/${args.code}`,
      });
  }
}
