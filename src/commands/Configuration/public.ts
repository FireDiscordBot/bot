import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { DiscoveryUpdateOp } from "@fire/lib/interfaces/stats";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import VanityURLs from "@fire/src/modules/vanityurls";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Message } from "@fire/lib/ws/Message";
import { GuildFeatures, Permissions } from "discord.js";

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

  async run(command: ApplicationCommandMessage) {
    if (command.guild.memberCount <= 20)
      return await command.error("PUBLIC_MEMBER_COUNT_TOO_SMALL");
    else if (+new Date() - command.guild.createdTimestamp < 2629800000)
      return await command.error("PUBLIC_GUILD_TOO_YOUNG");
    else if (
      command.guild.features.includes("DISCOVERABLE_DISABLED" as GuildFeatures)
    )
      return await command.error("PUBLIC_DISCOVERABLE_DISABLED");

    const current = command.guild.settings.get<boolean>("utils.public", false);
    const vanityurls = this.client.getModule("vanityurls") as VanityURLs;
    if (vanityurls.blacklisted.includes(command.guild.id))
      return await command.error("PUBLIC_VANITY_BLACKLIST");
    const vanitys = await this.client.db
      .query("SELECT code FROM vanity WHERE gid=$1 AND redirect IS NULL", [
        command.guild.id,
      ])
      .first()
      .catch(() => {});
    if (!vanitys || !vanitys.get("code"))
      return await command.error("PUBLIC_VANITY_REQUIRED", {
        prefix: command.util?.parsed?.prefix,
      });
    await command.guild.settings.set<boolean>("utils.public", !current);
    if (!current) {
      if (this.client.manager.ws?.open)
        this.client.manager.ws?.send(
          MessageUtil.encode(
            new Message(EventType.DISCOVERY_UPDATE, {
              op: DiscoveryUpdateOp.ADD,
              guilds: [command.guild.getDiscoverableData()],
            })
          )
        );
      await command.success("PUBLIC_ENABLED", { vanity: vanitys.get("code") });
      await command.guild.actionLog(
        `${constants.emojis.statuspage.operational} ${command.language.get(
          "PUBLIC_ENABLED_LOG",
          {
            user: command.author.toString(),
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
              guilds: [{ id: command.guild.id }],
            })
          )
        );
      await command.success("PUBLIC_DISABLED");
      await command.guild.actionLog(
        `${constants.emojis.statuspage.major_outage} ${command.language.get(
          "PUBLIC_DISABLED_LOG",
          {
            user: command.author.toString(),
          }
        )}`,
        "public_toggle"
      );
    }
  }
}
