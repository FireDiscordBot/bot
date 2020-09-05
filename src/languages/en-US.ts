import { Language } from "../../lib/util/language";
import { GuildMember } from "discord.js";
import { TextChannel } from "discord.js";

export default class extends Language {
  constructor() {
    super("en-US", {
      language: {
        DEFAULT: (key: string) =>
          `${key} has not been localized for en-US yet.`,
        USER_NOT_FOUND: "User not found :(",
        UNKNOWN_COMMAND: "Command not found",
        AT_COMMAND_DESCRIPTION:
          "command that does autotip bot thing but not rn because I got banned",
        AT_CHANNEL_NOT_FOUND: "I could not find the autotip channel.",
        AT_NO_RESPONSE: "Got no response :(",
        AUTODECANCER_COMMAND_DESCRIPTION: `Toggle renaming those with "cancerous" (non-ascii) names`,
        AUTODECANCER_ENABLED: `Enabled autodecancer. **New** users with "cancerous" (non-ascii) names will be renamed`,
        AUTODECANCER_DISABLED: `Disabled autodecancer. **New** users with "cancerous" (non-ascii) names will no longer be renamed`,
        AUTODEHOIST_COMMAND_DESCRIPTION: `Toggle renaming those with hoisted names`,
        AUTODEHOIST_ENABLED: `Enabled autodehoist. **New** users with hoisted names will be renamed`,
        AUTODEHOIST_DISABLED: `Disabled autodehoist. **New** users with hoisted names will no longer be renamed`,
        AVATAR_COMMAND_DESCRIPTION: "Get a user's avatar",
        BADNAME_COMMAND_DESCRIPTION:
          "Change the name used for auto dehoist/decancer",
        BADNAME_NO_CHANGES: `I did absolutely nothing because that's already set as the "bad name"`,
        BADNAME_SET: (name: string) =>
          `I have set the "bad name" to ${name}. This will **not** rename existing users`,
        BADNAME_RESET: `I have reset the "bad name" to John Doe 0000 (with 0000 being their discriminator).
This will **not** rename existing users`,
        DEBUG_NO_COMMAND: "You must provide a valid command to debug",
        DEBUGGING_DEBUG: "Debug command is working",
        DEBUG_OWNER_ONLY: "Only my owner can use this command",
        DEBUG_PERMS_PASS: "No permissions missing",
        DEBUG_PERMS_CHECKS_FAIL: "Permission Checks Failed!",
        DEBUG_PERMS_FAIL: (userMissing: string[], clientMissing: string[]) => {
          return {
            user: userMissing.length
              ? `You are missing the permission${
                  userMissing.length > 1 ? "s" : ""
                } ${userMissing.join(", ")}`
              : null,
            client: clientMissing.length
              ? `I am missing the permission${
                  clientMissing.length > 1 ? "s" : ""
                } ${clientMissing.join(", ")}`
              : null,
          };
        },
        DEBUG_COMMAND_DISABLE_BYPASS:
          "Command is disabled but you are bypassed",
        DEBUG_COMMAND_DISABLED: "Command is disabled.",
        DEBUG_COMMAND_NOT_DISABLED: "Command is not disabled",
        DEBUG_MUTE_BYPASS: (channel: TextChannel, bypass: string[]) =>
          `The following users/roles will bypass mutes in ${channel}\n${bypass.join(
            ", "
          )}`,
        DEBUG_MUTE_NO_BYPASS: (channel: TextChannel) =>
          `Nobody can bypass mutes in ${channel}`,
        DEBUG_NO_EMBEDS: "I cannot send embeds",
        PING_COMMAND_DESCRIPTION: "Shows you my ping to discord's servers",
        PING_INITIAL_MESSAGE: "Pinging...",
      },
      enabled: true,
    });
  }
}
