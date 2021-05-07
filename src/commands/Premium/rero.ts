import {
  MessageReaction,
  MessageEmbed,
  Permissions,
  GuildEmoji,
  Role,
} from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import * as pEvent from "p-event";

const { reactions, emojis } = constants;

export default class ReactionRole extends Command {
  constructor() {
    super("reactionrole", {
      description: (language: Language) =>
        language.get("REACTIONROLE_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.MANAGE_ROLES],
      userPermissions: [Permissions.FLAGS.MANAGE_ROLES],
      args: [
        {
          id: "role",
          type: "role",
          required: true,
          default: null,
        },
      ],
      aliases: ["rero", "reactrole", "reactroles", "reactionroles"],
      enableSlashCommand: true,
      restrictTo: "guild",
      premium: true,
    });
  }

  async exec(message: FireMessage, args: { role?: Role }) {
    if (!args.role) return;
    if (
      args.role &&
      (args.role.managed ||
        args.role.rawPosition >= message.guild.me.roles.highest.rawPosition ||
        args.role.id == message.guild.roles.everyone.id ||
        (args.role.rawPosition >= message.member.roles.highest.rawPosition &&
          message.guild.ownerID != message.author.id))
    )
      return await message.error("ERROR_ROLE_UNUSABLE");

    const initialMessage = await message.send(
      "REACTIONROLE_INITIAL",
      args.role.toString()
    );
    let reaction: MessageReaction, user: FireUser;
    [reaction, user] = await pEvent(this.client, "messageReactionAdd", {
      timeout: 60000,
      multiArgs: true,
      filter: ([messageReaction, user]) => {
        return (
          user?.id == message.author.id &&
          messageReaction.message?.guild.id == message.guild.id
        );
      },
    }).catch(() => [null, null]);
    await initialMessage.delete();
    if (!reaction || !user) return await message.error("REACTIONROLE_REJECTED");

    if (reaction.message.partial)
      await reaction.message.fetch().catch(() => {});
    if (reaction.message.partial)
      // if still partial, something go brokey, send error!
      return await message.error("REACTIONROLE_MESSAGE_PARTIAL");

    const { message: reactionMessage } = reaction;
    const emoji =
      reaction.emoji instanceof GuildEmoji
        ? reaction.emoji.id
        : reaction.emoji.name;
    const existing = message.guild.reactionRoles
      .get(reactionMessage.id)
      ?.find((data) => data.role == args.role.id && data.emoji == emoji);
    if (existing) {
      const deleted = await this.client.db
        .query("DELETE FROM reactrole WHERE mid=$1 AND rid=$2 AND eid=$3;", [
          reactionMessage.id,
          args.role.id,
          emoji,
        ])
        .catch(() => {});
      if (deleted && deleted.status.startsWith("DELETE ")) {
        await this.logDeletion(message, args.role, reaction);
        return await message.success(
          "REACTIONROLE_DELETED",
          reactionMessage.author.toString(),
          reactionMessage.channel.toString(),
          reactionMessage.url,
          reaction.emoji.toString(),
          args.role.toString()
        );
      } else return await message.error();
    }

    const confirmation = await message.send(
      "REACTIONROLE_CONFIRMATION",
      reactionMessage.author.toString(),
      reactionMessage.channel.toString(),
      reactionMessage.url,
      reaction.emoji.toString(),
      args.role.toString()
    );
    confirmation.react(reactions.success);
    confirmation.react(reactions.error);
    let yesOrNo: MessageReaction;
    [yesOrNo] = await pEvent(this.client, "messageReactionAdd", {
      timeout: 10000,
      multiArgs: true,
      filter: ([messageReaction, user]) =>
        user.id == message.author.id &&
        messageReaction.message?.id == confirmation.id &&
        (messageReaction.emoji.toString() == emojis.success ||
          messageReaction.emoji.toString() == emojis.error),
    }).catch(() => [null]);
    await confirmation.delete().catch(() => {});
    if (!yesOrNo || yesOrNo.emoji?.toString() == emojis.error)
      return await message.send("REACTIONROLE_CANCELLED");

    const inserted = await this.client.db
      .query(
        "INSERT INTO reactrole (gid, mid, rid, eid) VALUES ($1, $2, $3, $4);",
        [message.guild.id, reactionMessage.id, args.role.id, emoji]
      )
      .catch(() => {});
    if (inserted && inserted.status.startsWith("INSERT ")) {
      if (!message.guild.reactionRoles.has(reactionMessage.id))
        message.guild.reactionRoles.set(reactionMessage.id, []);
      message.guild.reactionRoles
        .get(reactionMessage.id)
        ?.push({ role: args.role.id, emoji });
      await this.logCreation(message, args.role, reaction);
      return await message.success("REACTIONROLE_COMPLETE");
    } else return await message.edit("REACTIONROLE_OOPSIE");
  }

  async logCreation(
    message: FireMessage,
    role: Role,
    reaction: MessageReaction
  ) {
    const embed = new MessageEmbed()
      .setColor(message.member?.displayHexColor || "#2ECC71")
      .setTimestamp()
      .setAuthor(
        message.guild.language.get(
          "REACTIONROLE_LOG_AUTHOR",
          message.guild.name
        ),
        message.guild.iconURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
        reaction.message?.url
      )
      .addField(
        message.guild.language.get("MODERATOR"),
        message.author.toString()
      )
      .addField(
        message.guild.language.get("EMOJI"),
        reaction.emoji?.toString() || "???"
      )
      .addField(message.guild.language.get("ROLE"), role.toString())
      .setFooter(`${role.id} | ${message.author.id}`);
    return await message.guild.actionLog(embed, "reactrole");
  }

  async logDeletion(
    message: FireMessage,
    role: Role,
    reaction: MessageReaction
  ) {
    const embed = new MessageEmbed()
      .setColor("#E74C3C")
      .setTimestamp()
      .setAuthor(
        message.guild.language.get(
          "REACTIONROLE_LOG_AUTHOR",
          message.guild.name
        ),
        message.guild.iconURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
        reaction.message?.url
      )
      .addField(
        message.guild.language.get("MODERATOR"),
        message.author.toString()
      )
      .addField(
        message.guild.language.get("EMOJI"),
        reaction.emoji?.toString() || "???"
      )
      .addField(message.guild.language.get("ROLE"), role.toString())
      .setFooter(`${role.id} | ${message.author.id}`);
    return await message.guild.actionLog(embed, "reactrole");
  }
}
