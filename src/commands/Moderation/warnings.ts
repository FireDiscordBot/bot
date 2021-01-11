import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "../../../lib/util/paginators";
import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { MessageEmbed } from "discord.js";

export default class Warnings extends Command {
  constructor() {
    super("warnings", {
      description: (language: Language) =>
        language.get("WARNINGS_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "user",
          type: "memberSilent",
          required: true,
          default: null,
        },
      ],
      restrictTo: "guild",
      moderatorOnly: true,
      aliases: ["warns"],
    });
  }

  async exec(message: FireMessage, args: { user: FireMember }) {
    if (!args.user) args.user = message.member;
    const warnings = await this.client.db
      .query("SELECT * FROM modlogs WHERE uid=$1 AND gid=$2 AND type=$3", [
        args.user.id,
        message.guild.id,
        "warn",
      ])
      .catch(() => {});
    if (!warnings || !warnings.rows.length)
      return await message.error("WARNINGS_NONE_FOUND");
    const paginator = new WrappedPaginator("", "", 800);
    for await (const warn of warnings) {
      paginator.addLine(`**Case ID**: ${warn.get("caseid")}
**Reason**: ${warn.get("reason")}
**Moderator ID**: ${warn.get("modid") || "¯\\_(ツ)_/¯"}
**Date**: ${warn.get("date")}
**-----------------**`);
    }
    const embed = new MessageEmbed()
      .setColor("#E67E22")
      .setTimestamp(new Date());
    const paginatorInterface = new PaginatorEmbedInterface(
      this.client,
      paginator,
      { owner: message.member, embed }
    );
    return await paginatorInterface.send(message.channel);
  }
}
