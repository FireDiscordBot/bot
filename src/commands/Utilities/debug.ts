import { SlashCommandMessage } from "../../../lib/extensions/slashCommandMessage";
import { PermissionString, TextChannel, MessageEmbed } from "discord.js";
import { constants, titleCase } from "../../../lib/util/constants";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

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
    });
  }

  async exec(message: FireMessage, args: { command: Command }) {
    const cmd = args.command;
    const channel =
      message instanceof SlashCommandMessage
        ? message.channel.real
        : message.channel;

    if (!cmd) {
      return await channel.send({
        embed: this.createEmbed(message, [
          `${error} ${message.language.get("DEBUG_NO_COMMAND")}`,
        ]),
      });
    }

    if (!cmd.id) {
      return await channel.send({
        embed: this.createEmbed(message, [
          `${error} ${message.language.get("UNKNOWN_COMMAND")}`,
        ]),
      });
    }

    if (cmd.id == this.id) {
      return await channel.send({
        embed: this.createEmbed(message, [
          `${success} ${message.language.get("DEBUGGING_DEBUG")}`,
        ]),
      });
    }

    const details: string[] = [];
    const permissionChecks = await this.client.commandHandler.runPermissionChecks(
      message,
      cmd
    );

    const clientPermissions = cmd.clientPermissions as PermissionString[];
    const userPermissions = cmd.userPermissions as PermissionString[];

    if (permissionChecks && message.guild) {
      const userMissing = userPermissions
        .filter((permission) => !message.member?.permissions.has(permission))
        .map((permission) =>
          this.client.util.cleanPermissionName(permission, message.language)
        );

      const clientMissing = clientPermissions
        .filter((permission) => !message.guild.me?.permissions.has(permission))
        .map((permission) =>
          this.client.util.cleanPermissionName(permission, message.language)
        );

      const permMsg = message.language.get(
        "DEBUG_PERMS_FAIL",
        userMissing,
        clientMissing
      ) as { user: string | null; client: string | null };

      if (userMissing || clientMissing)
        details.push(
          `${error} ${message.language.get("DEBUG_PERMS_CHECKS_FAIL")}` +
            (permMsg.user ? `\n${permMsg.user}` : "") +
            (permMsg.client ? `\n${permMsg.client}` : "")
        );
    } else if (permissionChecks)
      details.push(`${error} ${message.language.get("DEBUG_REQUIRES_PERMS")}`);
    else details.push(`${success} ${message.language.get("DEBUG_PERMS_PASS")}`);

    let inhibitorChecks = [];

    const inhibitors = [...this.client.inhibitorHandler.modules.values()].sort(
      // @ts-ignore (idk why it thinks priority doesn't exist)
      (a, b) => b.priority - a.priority
    );
    for (const inhibitor of inhibitors) {
      let exec = inhibitor.exec(message, cmd);
      if (this.client.util.isPromise(exec)) exec = await exec;
      if (exec) inhibitorChecks.push(inhibitor.reason);
    }

    for (const inhibitorCheck of inhibitorChecks) {
      if (inhibitorCheck != null) {
        if (inhibitorCheck == "owner")
          details.push(
            `${error} ${message.language.get("COMMAND_OWNER_ONLY")}`
          );
        if (inhibitorCheck == "guild")
          details.push(
            `${error} ${message.language.get(
              "COMMAND_GUILD_ONLY",
              this.client.config.inviteLink
            )}`
          );
        if (inhibitorCheck == "premium")
          details.push(
            `${error} ${message.language.get("COMMAND_PREMIUM_ONLY")}`
          );
        if (inhibitorCheck == "experimentlock")
          details.push(
            `${error} ${message.language.get("COMMAND_EXPERIMENT_REQUIRED")}`
          );
        if (inhibitorCheck == "accountage")
          details.push(
            `${error} ${message.language.get("COMMAND_ACCOUNT_TOO_YOUNG")}`
          );
        if (inhibitorCheck == "guildlock")
          details.push(
            `${error} ${message.language.get("COMMAND_GUILD_LOCKED")}`
          );
      }
    }

    const disabledCommands: string[] =
      message.guild?.settings.get("disabled.commands", []) || [];

    if (disabledCommands.includes(cmd.id)) {
      if (message.member?.permissions.has("MANAGE_MESSAGES"))
        details.push(
          `${success} ${message.language.get("DEBUG_COMMAND_DISABLE_BYPASS")}`
        );
      else
        details.push(
          `${error} ${message.language.get("DEBUG_COMMAND_DISABLE")}`
        );
    } else
      details.push(
        `${success} ${message.language.get("DEBUG_COMMAND_NOT_DISABLED")}`
      );

    if (cmd.id == "mute" && message.guild) {
      const overwrites = (channel as TextChannel).permissionOverwrites;
      const bypass = overwrites
        .map((value, key) => {
          const overwriteFor =
            message.guild.roles.cache.get(key) ||
            message.guild.members.cache.get(key);
          return value.allow.has("SEND_MESSAGES")
            ? overwriteFor?.toString() || ""
            : "";
        })
        .filter((s) => s != "");

      if (bypass.length > 0)
        details.push(
          `${error} ${message.language.get(
            "DEBUG_MUTE_BYPASS",
            channel.toString(),
            bypass
          )}`
        );
      else
        details.push(
          `${success} ${message.language.get(
            "DEBUG_MUTE_NO_BYPASS",
            channel.toString()
          )}`
        );
    }

    if (
      !message.guild ||
      (message.guild && message.guild.me?.permissions.has("EMBED_LINKS"))
    )
      return await channel.send(this.createEmbed(message, details));
    else {
      details.push(`${error} ${message.language.get("DEBUG_NO_EMBEDS")}`);
      return await channel.send(details.join("\n"));
    }
  }

  private createEmbed(message: FireMessage, details: string[]) {
    const issues = details.filter((detail) => detail.startsWith(error));
    return new MessageEmbed()
      .setTitle(message.language.get("DEBUG_ISSUES", issues))
      .setColor(message.member?.displayColor || "#ffffff")
      .setTimestamp(new Date())
      .setDescription(details.join("\n"));
  }
}
