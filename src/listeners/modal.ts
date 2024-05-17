import { ModalMessage } from "@fire/lib/extensions/modalmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { MinecraftLogInfo } from "@fire/lib/interfaces/mclogs";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { Listener } from "@fire/lib/util/listener";
import * as centra from "centra";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { Channel, MessageEmbed, Snowflake, ThreadChannel } from "discord.js";

export default class Modal extends Listener {
  constructor() {
    super("modal", {
      emitter: "client",
      event: "modal",
    });
  }

  // used to handle generic modals like the ticket close reason modal
  async exec(modal: ModalMessage) {
    const guild = modal.guild;

    // Run handlers
    try {
      if (this.client.modalHandlers.has(modal.customId))
        this.client.modalHandlers.get(modal.customId)(modal);
    } catch {}
    try {
      if (this.client.modalHandlersOnce.has(modal.customId)) {
        const handler = this.client.modalHandlersOnce.get(modal.customId);
        this.client.modalHandlersOnce.delete(modal.customId);
        handler(modal);
      }
    } catch {}

    if (modal.customId.startsWith("ticket_close")) {
      modal.channel.ack();
      const channelId = modal.customId.slice(13) as Snowflake;
      const channel = this.client.channels.cache.get(channelId) as
        | FireTextChannel
        | ThreadChannel;
      if (
        !channel ||
        !channel.guild ||
        (channel.type != "GUILD_TEXT" && channel.type != "GUILD_PRIVATE_THREAD")
      )
        return;
      const canClose = await modal.guild.canCloseTicket(channel, modal.member);
      if (canClose == "forbidden")
        return await modal.error("TICKET_CLOSE_FORBIDDEN");
      else if (canClose == "nonticket")
        return await modal.error("TICKET_NON_TICKET");
      const reason = modal.interaction.fields.getTextInputValue("close_reason");
      if (!reason)
        return await modal.error("COMMAND_ERROR_GENERIC", { id: "close" });
      const closed = await guild
        .closeTicket(channel, modal.member, reason)
        .catch((e: Error) => e);
      if (!(closed instanceof Channel))
        return await modal.error("COMMAND_ERROR_500_CTX", {
          ctx: typeof closed == "string" ? closed : "close",
        });
    }

    if (modal.customId.startsWith("tag_edit:") && modal.guild) {
      await modal.channel.ack();
      modal.flags = 64; // make messages ephemeral
      if (!modal.member?.permissions.has(PermissionFlagsBits.ManageMessages))
        return await modal
          .error("MISSING_PERMISSIONS_USER", {
            permissions: this.client.util.cleanPermissionName(
              PermissionFlagsBits.ManageMessages,
              modal.language
            ),
            command: "tag edit",
          })
          .catch(() => {});

      const name = modal.customId.slice(9);
      if (!modal.guild.tags) {
        // this should never be true since we init the tag manager on button click
        modal.guild.tags = new GuildTagManager(this.client, modal.guild);
        await modal.guild.tags.init();
      }
      const tag = await modal.guild.tags.getTag(name, false);
      if (!tag) return await modal.error("TAG_INVALID_TAG", { tag: name });

      const newName = modal.interaction.fields.getTextInputValue("tag_name");
      if (newName.length && newName != name) {
        const renamed = await modal.guild.tags.renameTag(name, newName);
        if (!renamed) return await modal.error("TAG_EDIT_NAME_FAILED");
      }

      const newContent =
        modal.interaction.fields.getTextInputValue("tag_content");
      if (newContent.length) {
        const edited = await modal.guild.tags.editTag(
          newName || name,
          newContent
        );
        if (!edited) return await modal.error("TAG_EDIT_CONTENT_FAILED");
      }

      return await modal.success("TAG_EDIT_SUCCESS");
    }

    if (modal.customId.startsWith("mclogscan:solution:")) {
      await modal.channel.ack();
      modal.flags = 64; // make messages ephemeral
      const enUS = this.client.getLanguage("en-US");
      const url = "https://" + modal.customId.slice(19);

      if (!this.client.manager.REST_HOST)
        return await modal.error("ERROR_CONTACT_SUPPORT");

      const logInfoReq = await centra(
        `${this.client.manager.REST_HOST}/${this.client.manager.CURRENT_REST_VERSION}/minecraft/logs`,
        "POST"
      )
        .header("User-Agent", this.client.manager.ua)
        .header("Authorization", process.env.WS_AUTH)
        .body({ url }, "json")
        .send();
      if (logInfoReq.statusCode != 200)
        return await modal.error("MINECRAFT_LOGSCAN_SOLUTION_MODAL_NO_INFO");
      const logInfo = (await logInfoReq.json()) as MinecraftLogInfo;

      const infoEmbed = new MessageEmbed()
        .setTitle(enUS.get("MINECRAFT_LOGSCAN_SOLUTION_EMBED_TITLE"))
        .setAuthor({
          name: `${modal.author.displayName} (${modal.author.id})`,
          iconURL: modal.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          }),
        })
        .setURL(url)
        .setDescription(
          enUS.get(
            logInfo.loader && logInfo.mcVersion
              ? "MINECRAFT_LOGSCAN_SOLUTION_LOG_INFO_FULL"
              : logInfo.mcVersion
              ? "MINECRAFT_LOGSCAN_SOLUTION_LOG_INFO_NO_LOADER"
              : "MINECRAFT_LOGSCAN_SOLUTION_LOG_INFO_BASIC",
            {
              user: logInfo.user,
              loader: logInfo.loader,
              version: logInfo.loaderVersion,
              minecraft: logInfo.mcVersion,
            }
          )
        )
        .addFields(
          [
            logInfo.solutions.length
              ? {
                  name: enUS.get("MC_LOG_POSSIBLE_SOLUTIONS"),
                  value: logInfo.solutions.join("\n"),
                }
              : undefined,
            logInfo.recommendations.length
              ? {
                  name: enUS.get("MC_LOG_RECOMMENDATIONS"),
                  value: logInfo.recommendations.join("\n"),
                }
              : undefined,
            {
              name: enUS.get("GUILD"),
              value: logInfo.guild,
            },
            {
              name: enUS.get("MODS"),
              value: logInfo.mods.length.toLocaleString(enUS.id),
            },
            {
              name: enUS.get("PROFILE"),
              value: logInfo.profile.ign
                ? `${logInfo.profile.ign} (${logInfo.profile.uuid})`
                : "N/A",
            },
          ].filter((f) => !!f)
        )
        .setFooter({
          text: enUS.get("MINECRAFT_LOGSCAN_SOLUTION_EMBED_FOOTER"),
        })
        .setTimestamp(new Date(logInfo.scannedAt));
      const solutionEmbed = new MessageEmbed().addFields([
        {
          name: enUS.get("MINECRAFT_LOGSCAN_SOLUTION_MODAL_DESC_LABEL"),
          value: modal.interaction.fields.getTextInputValue("description"),
        },
        {
          name: enUS.get("MINECRAFT_LOGSCAN_SOLUTION_MODAL_SOLUTION_LABEL"),
          value: modal.interaction.fields.getTextInputValue("solution"),
        },
      ]);

      const messageReq = await this.client.req
        .channels("1148234164315893792")
        .messages.post({
          data: {
            embeds: [infoEmbed.toJSON(), solutionEmbed.toJSON()],
          },
        })
        .catch(() => {});
      if (!messageReq) return await modal.error("ERROR_CONTACT_SUPPORT");
      else return await modal.success("MINECRAFT_LOGSCAN_SOLUTION_SUBMITTED");
    }
  }
}
