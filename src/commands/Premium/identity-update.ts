import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { ModalMessage } from "@fire/lib/extensions/modalmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import * as centra from "centra";
import {
  PermissionFlagsBits,
  RESTPatchAPIGuildMemberResult,
} from "discord-api-types/v9";
import {
  CommandInteraction,
  FileUploadComponent,
  LabelComponent,
  Modal,
  TextInputComponent,
} from "discord.js";
import { TextInputStyles } from "discord.js/typings/enums";

const validImageContentTypes = ["image/jpeg", "image/png", "image/gif"];

export default class IdentityUpdate extends Command {
  constructor() {
    super("identity-update", {
      description: (language: Language) =>
        language.get("IDENTITY_UPDATE_COMMAND_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageGuild],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      ephemeral: true,
      premium: true,
      lock: "guild",
      parent: "identity",
    });
  }

  async run(command: ApplicationCommandMessage) {
    const me = command.guild.members.me as FireMember;

    const modal = new Modal()
      .setTitle(command.language.get("IDENTITY_MODAL_TITLE"))
      .setCustomId(`identity:${command.guildId}`)
      .addComponents(
        new LabelComponent()
          .setId(1)
          .setLabel(command.language.get("IDENTITY_NICKNAME_LABEL"))
          .setComponent(
            new TextInputComponent()
              .setCustomId("nickname")
              .setRequired(false)
              .setValue(me.nickname ?? me.user.username)
              .setStyle(TextInputStyles.SHORT)
              .setMaxLength(32)
          ),
        new LabelComponent()
          .setId(2)
          .setLabel(command.language.get("IDENTITY_BIO_LABEL"))
          .setComponent(
            new TextInputComponent()
              .setCustomId("bio")
              .setRequired(false)
              .setValue(command.guild.settings.get("identity.bio"))
              .setStyle(TextInputStyles.PARAGRAPH)
              .setMaxLength(190)
          ),
        new LabelComponent()
          .setId(3)
          .setLabel(command.language.get("IDENTITY_AVATAR_LABEL"))
          .setDescription(command.language.get("IDENTITY_AVATAR_DESCRIPTION"))
          .setComponent(
            new FileUploadComponent()
              .setCustomId("avatar")
              .setMinValues(1)
              .setMaxValues(1)
              .setRequired(false)
          ),
        new LabelComponent()
          .setId(4)
          .setLabel(command.language.get("IDENTITY_BANNER_LABEL"))
          .setDescription(command.language.get("IDENTITY_BANNER_DESCRIPTION"))
          .setComponent(
            new FileUploadComponent()
              .setCustomId("banner")
              .setMinValues(1)
              .setMaxValues(1)
              .setRequired(false)
          )
      );
    const modalPromise = this.waitForModal(command);
    await (command.slashCommand as CommandInteraction).showModal(modal);

    const response = await modalPromise;
    if (!response) return;
    await response.channel.ack();

    let nick: string, bio: string, avatar: string, banner: string;
    const nicknameInput = response.getTextInputValue("nickname"),
      bioInput = response.getTextInputValue("bio"),
      avatarInput = response.getUploadedFiles("avatar")?.first(),
      bannerInput = response.getUploadedFiles("banner")?.first();

    if (
      nicknameInput &&
      nicknameInput.length &&
      nicknameInput != (me.nickname ?? me.user.username)
    )
      nick = nicknameInput;

    // discord is stupid and doesn't provide bios to bots, not even their own bio
    // so we will always accept the input even if it's the same
    // (because we have no way of knowing)
    if (
      bioInput &&
      bioInput.length &&
      bioInput != command.guild.settings.get("identity.bio")
    )
      bio = bioInput;

    if (avatarInput) {
      if (avatarInput.size >= 10_000_000)
        return await response.error("IDENTITY_AVATAR_TOO_LARGE");
      else if (!validImageContentTypes.includes(avatarInput.contentType))
        return await response.error("IDENTITY_AVATAR_INVALID_TYPE");

      const req = await centra(avatarInput.url)
        .header("User-Agent", this.client.manager.ua)
        .send();
      if (req.statusCode != 200)
        return await response.error("IDENTITY_AVATAR_FAILED_TO_FETCH");
      avatar = `data:${avatarInput.contentType};base64,${req.body.toString(
        "base64"
      )}`;
    }

    if (bannerInput) {
      if (bannerInput.size >= 10_000_000)
        return await response.error("IDENTITY_BANNER_TOO_LARGE");
      else if (!validImageContentTypes.includes(bannerInput.contentType))
        return await response.error("IDENTITY_BANNER_INVALID_TYPE");

      const req = await centra(bannerInput.url)
        .header("User-Agent", this.client.manager.ua)
        .send();
      if (req.statusCode != 200)
        return await response.error("IDENTITY_BANNER_FAILED_TO_FETCH");
      banner = `data:${bannerInput.contentType};base64,${req.body.toString(
        "base64"
      )}`;
    }

    const updated = await this.client.req
      .guilds(command.guildId)
      .members("@me")
      .patch<RESTPatchAPIGuildMemberResult & { bio?: string }>({
        data: {
          nick,
          bio,
          avatar,
          banner,
        },
      })
      .catch(() => {});

    if (updated) {
      if ("bio" in updated)
        await command.guild.settings.set(
          "identity.bio",
          updated.bio,
          command.author
        );

      // we'll resend GUILD_CREATE for the server
      // to update the member data since it will just overwrite
      // any existing member data that was sent
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.GUILD_CREATE, {
            id: me.guild.id,
            name: me.guild.name,
            icon: me.guild.icon,
            member: me.toAPIMemberJSON(),
          })
        )
      );

      return await response.success("IDENTITY_UPDATE_SUCCESS", {
        guild: command.guild.name,
      });
    } else
      return await response.error("IDENTITY_UPDATE_FAILED", {
        guild: command.guild.name,
      });
  }

  waitForModal(command: ApplicationCommandMessage): Promise<ModalMessage> {
    return new Promise((resolve) => {
      this.client.modalHandlersOnce.set(`identity:${command.guildId}`, resolve);

      setTimeout(() => {
        this.client.modalHandlersOnce.delete(`identity:${command.guildId}`);
        resolve(null);
      }, 300_000);
    });
  }
}
