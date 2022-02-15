import { ModalMessage } from "@fire/lib/extensions/modalmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { Listener } from "@fire/lib/util/listener";
import { Channel, Permissions, Snowflake, ThreadChannel } from "discord.js";

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

    if (modal.customId.startsWith("ticket_close")) {
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
      const reason = modal.interaction.getTextInputValue("close_reason");
      if (!reason)
        return await modal.error("COMMAND_ERROR_GENERIC", { id: "close" });
      const closure = await guild
        .closeTicket(channel, modal.member, reason)
        .catch(() => {});
      if (closure instanceof Channel) return await modal.channel.ack();
    }

    if (modal.customId.startsWith("tag_edit:") && modal.guild) {
      await modal.channel.ack();
      modal.flags = 64; // make messages ephemeral
      if (!modal.member?.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES))
        return await modal
          .error("MISSING_PERMISSIONS_USER", {
            permissions: this.client.util.cleanPermissionName(
              "MANAGE_MESSAGES",
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

      const newName = modal.interaction.getTextInputValue("tag_name");
      if (newName.length && newName != name) {
        const renamed = await modal.guild.tags.renameTag(name, newName);
        if (!renamed) return await modal.error("TAG_EDIT_NAME_FAILED");
      }

      const newContent = modal.interaction.getTextInputValue("tag_content");
      if (newContent.length) {
        const edited = await modal.guild.tags.editTag(
          newName || name,
          newContent
        );
        if (!edited) return await modal.error("TAG_EDIT_CONTENT_FAILED");
      }

      return await modal.success("TAG_EDIT_SUCCESS");
    }
  }
}
