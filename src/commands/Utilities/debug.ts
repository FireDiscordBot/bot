import {
  BitFieldResolvable,
  PermissionString,
  GuildChannel,
  MessageEmbed,
  Permissions,
  DMChannel,
} from "discord.js";
import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { Command } from "@fire/lib/util/command";
import { TOptions, StringMap } from "i18next";

const {
  emojis: { success, error },
} = constants;

export default class Debug extends Command {
  constructor() {
    super("debug", {
      description: (language: Language) =>
        language.get("DEBUG_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "command",
          type: "command",
          default: null,
          required: true,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
    });
  }

  async exec(message: FireMessage, args: { command: Command }) {
    const cmd = args.command;
    const channel =
      message instanceof ApplicationCommandMessage
        ? message.realChannel
        : message.channel;

    if (!cmd) return await this.sendSingleError(message, "DEBUG_NO_COMMAND");
    if (!cmd.id) return await this.sendSingleError(message, "UNKNOWN_COMMAND");
    if (cmd.id == this.id)
      return await this.sendSingleSuccess(message, "DEBUGGING_DEBUG");
    if (this.client.util.isBlacklisted(message.author.id, message.guild))
      return await this.sendSingleError(message, "DEBUG_BLACKLISTED");
    if (+new Date() - message.author.createdTimestamp < 86400000)
      return await this.sendSingleError(message, "COMMAND_ACCOUNT_TOO_YOUNG");
    if (cmd.ownerOnly && !this.client.isOwner(message.author))
      return await this.sendSingleError(message, "COMMAND_OWNER_ONLY");
    if (cmd.superuserOnly && !message.author.isSuperuser())
      return await this.sendSingleError(message, "COMMAND_SUPERUSER_ONLY");
    if (cmd.moderatorOnly && !message.member?.isModerator())
      return await this.sendSingleError(message, "COMMAND_MODERATOR_ONLY");
    if (cmd.channel == "guild" && !message.guild)
      return await this.sendSingleError(message, "COMMAND_GUILD_ONLY", {
        invite: this.client.config.inviteLink,
      });
    if (cmd.guilds.length && !cmd.guilds.includes(message.guild?.id))
      return await this.sendSingleError(message, "COMMAND_GUILD_LOCKED");
    if (cmd.premium && !message.guild?.premium)
      return await this.sendSingleError(message, "COMMAND_PREMIUM_GUILD_ONLY");

    const requiresExperiment = cmd.requiresExperiment;
    if (requiresExperiment) {
      const experiment = this.client.experiments.get(requiresExperiment.id);
      if (!experiment)
        return await this.sendSingleError(
          message,
          "COMMAND_EXPERIMENT_REQUIRED"
        );
      else if (
        !message.hasExperiment(experiment.hash, requiresExperiment.bucket)
      )
        return await this.sendSingleError(
          message,
          "COMMAND_EXPERIMENT_REQUIRED"
        );
    }

    const details: string[] = [];

    const clientMissing =
      channel instanceof DMChannel
        ? (cmd.clientPermissions as PermissionString[])
        : channel
            .permissionsFor(this.client.user)
            .missing(
              cmd.clientPermissions as BitFieldResolvable<
                PermissionString,
                bigint
              >
            );
    const userMissing =
      channel instanceof DMChannel
        ? (cmd.userPermissions as PermissionString[])
        : channel
            .permissionsFor(message.member)
            .missing(
              cmd.userPermissions as BitFieldResolvable<
                PermissionString,
                bigint
              >
            );

    const permissionChecks = clientMissing?.length || userMissing?.length;

    if (permissionChecks && message.guild) {
      const user = userMissing
        .map((permission) =>
          this.client.util.cleanPermissionName(permission, message.language)
        )
        .filter((permission) => !!permission);

      const client = clientMissing
        .map((permission) =>
          this.client.util.cleanPermissionName(permission, message.language)
        )
        .filter((permission) => !!permission);

      let permMsgUser: string, permMsgClient: string;
      if (user.length)
        permMsgUser = message.language.get("DEBUG_PERMS_FAIL_USER", {
          missing: user.join(", "),
        });
      if (client.length)
        permMsgUser = message.language.get("DEBUG_PERMS_FAIL_CLIENT", {
          missing: user.join(", "),
        });

      if (permMsgUser || permMsgClient)
        details.push(
          `${error} ${message.language.get("DEBUG_PERMS_CHECKS_FAIL")}` +
            (permMsgUser ? `\n${permMsgUser}` : "") +
            (permMsgClient ? `\n${permMsgClient}` : "")
        );
    } else if (permissionChecks)
      details.push(`${error} ${message.language.get("DEBUG_REQUIRES_PERMS")}`);
    else details.push(`${success} ${message.language.get("DEBUG_PERMS_PASS")}`);

    const disabledCommands =
      message.guild?.settings.get<string[]>("disabled.commands", []) ?? [];

    if (disabledCommands.includes(cmd.id)) {
      if (message.member?.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES))
        details.push(
          `${success} ${message.language.get("DEBUG_COMMAND_DISABLE_BYPASS")}`
        );
      else
        details.push(
          `${error} ${message.language.get("DEBUG_COMMAND_DISABLED")}`
        );
    } else if (message.guild)
      details.push(
        `${success} ${message.language.get("DEBUG_COMMAND_NOT_DISABLED")}`
      );

    if (cmd.id == "mute" && message.guild && channel instanceof GuildChannel) {
      const canSend = channel.permissionOverwrites.cache
        .filter((overwrite) =>
          overwrite.allow.has(Permissions.FLAGS.SEND_MESSAGES)
        )
        .map((overwrite) => overwrite.id);
      const roles = [
        ...canSend
          .map((id) => message.guild.roles.cache.get(id))
          .filter((role) => !!role),
        ...message.guild.roles.cache
          .filter(
            (role) =>
              role.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
              !canSend.find((id) => id == role.id)
          )
          .values(),
      ];
      const memberIds = canSend.filter(
        (id) => !roles.find((role) => role.id == id)
      );
      // owner can always bypass
      memberIds.push(message.guild.ownerId);
      const members: string[] = memberIds.length
        ? await message.guild.members
            .fetch({ user: memberIds })
            .then((found) =>
              found.map((member: FireMember) => member.toMention())
            )
            .catch(() => [])
        : [];

      const bypass = [...roles, ...members];

      if (bypass.length > 0)
        details.push(
          `${error} ${message.language.get("DEBUG_MUTE_BYPASS", {
            channel: channel.toString(),
            bypass: bypass.map((b) => b.toString()).join(", "),
          })}`
        );
      else
        details.push(
          `${success} ${message.language.get("DEBUG_MUTE_NO_BYPASS", {
            channel: channel.toString(),
          })}`
        );
    }

    if (
      !message.guild ||
      (message.guild &&
        message.guild.me?.permissions.has(Permissions.FLAGS.EMBED_LINKS))
    )
      return await message.channel.send({
        embeds: [this.createEmbed(message, details)],
      });
    else {
      details.push(`${error} ${message.language.get("DEBUG_NO_EMBEDS")}`);
      return await message.channel.send({ content: details.join("\n") });
    }
  }

  private createEmbed(message: FireMessage, details: string[]) {
    const issues = details.filter((detail) => detail.startsWith(error));
    return new MessageEmbed()
      .setTitle(
        message.language.get(
          issues.length ? "DEBUG_ISSUES_FOUND" : "DEBUG_NO_ISSUES",
          { issues: issues.length }
        )
      )
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setTimestamp()
      .setDescription(details.join("\n"));
  }

  private async sendSingleError(
    message: FireMessage,
    key: LanguageKeys,
    args?: TOptions<StringMap>
  ) {
    return await message.channel.send({
      embeds: [
        this.createEmbed(message, [
          `${error} ${message.language.get(key, args)}`,
        ]),
      ],
    });
  }

  private async sendSingleSuccess(
    message: FireMessage,
    key: LanguageKeys,
    args?: TOptions<StringMap>
  ) {
    return await message.channel.send({
      embeds: [
        this.createEmbed(message, [
          `${success} ${message.language.get(key, args)}`,
        ]),
      ],
    });
  }
}
