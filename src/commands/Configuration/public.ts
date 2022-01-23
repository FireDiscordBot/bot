import { DiscoveryUpdateOp } from "@fire/lib/interfaces/stats";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { FireMessage } from "@fire/lib/extensions/message";
import { EventType } from "@fire/lib/ws/util/constants";
import VanityURLs from "@fire/src/modules/vanityurls";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Message } from "@fire/lib/ws/Message";
import { Permissions } from "discord.js";

export default class Public extends Command {
  constructor() {
    super("public", {
      description: (language: Language) =>
        language.get("PUBLIC_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
    });
  }

  async exec(message: FireMessage) {
    if (message.guild.memberCount <= 20)
      return await message.error("PUBLIC_MEMBER_COUNT_TOO_SMALL");
    else if (+new Date() - message.guild.createdTimestamp < 2629800000)
      return await message.error("PUBLIC_GUILD_TOO_YOUNG");

    const current = message.guild.settings.get<boolean>("utils.public", false);
    const vanityurls = this.client.getModule("vanityurls") as VanityURLs;
    if (vanityurls.blacklisted.includes(message.guild.id))
      return await message.error("PUBLIC_VANITY_BLACKLIST");
    const vanitys = await this.client.db
      .query("SELECT code FROM vanity WHERE gid=$1 AND redirect IS NULL", [
        message.guild.id,
      ])
      .first()
      .catch(() => {});
    if (!vanitys || !vanitys.get("code"))
      return await message.error("PUBLIC_VANITY_REQUIRED", {
        prefix: message.util?.parsed?.prefix,
      });
    await message.guild.settings.set<boolean>("utils.public", !current);
    if (!current) {
      if (this.client.manager.ws?.open)
        this.client.manager.ws?.send(
          MessageUtil.encode(
            new Message(EventType.DISCOVERY_UPDATE, {
              op: DiscoveryUpdateOp.ADD,
              guilds: [message.guild.getDiscoverableData()],
            })
          )
        );
      await message.success("PUBLIC_ENABLED", { vanity: vanitys.get("code") });
      await message.guild.actionLog(
        `${constants.emojis.statuspage.operational} ${message.language.get(
          "PUBLIC_ENABLED_LOG",
          {
            user: message.author.toString(),
          }
        )}`,
        "public_toggle"
      );
    } else {
      if (this.client.manager.ws?.open)
        this.client.manager.ws?.send(
          MessageUtil.encode(
            new Message(EventType.DISCOVERY_UPDATE, {
              op: DiscoveryUpdateOp.REMOVE,
              guilds: [{ id: message.guild.id }],
            })
          )
        );
      await message.success("PUBLIC_DISABLED");
      await message.guild.actionLog(
        `${constants.emojis.statuspage.major_outage} ${message.language.get(
          "PUBLIC_DISABLED_LOG",
          {
            user: message.author.toString(),
          }
        )}`,
        "public_toggle"
      );
    }
  }
}
