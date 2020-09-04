import { Language } from "../../lib/util/language";

export default class extends Language {
  constructor() {
    super("en-US", {
      language: {
        DEFAULT: (key: string) =>
          `${key} has not been localized for en-US yet.`,
        USER_NOT_FOUND: "User not found :(",
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
        PING_COMMAND_DESCRIPTION: "Shows you my ping to discord's servers",
        PING_INITIAL_MESSAGE: "Pinging...",
        VOTE_COMMAND_DESCRIPTION: "Sends a link to Fire on a random bot list (sends direct vote link if you use the "vote" alias)",
      },
      enabled: true,
    });
  }
}
