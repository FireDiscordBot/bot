import { Language } from "../../lib/util/language";

export default class extends Language {
  constructor() {
    super("en-US", {
      language: {
        DEFAULT: (key: string) =>
          `${key} has not been localized for en-US yet.`,
        PING_COMMAND_DESCRIPTION: "Shows you my ping to discord's servers",
        PING_INITIAL_MESSAGE: "Pinging...",
        AUTODECANCER_COMMAND_DESCRIPTION: `Toggle renaming those with "cancerous" (non-ascii) names`,
        AUTODECANCER_ENABLED: `Enabled autodecancer. **New** users with "cancerous" (non-ascii) names will be renamed`,
        AUTODECANCER_DISABLED: `Disabled autodecancer. **New** users with "cancerous" (non-ascii) names will no longer be renamed`,
        AUTODEHOIST_COMMAND_DESCRIPTION: `Toggle renaming those with hoisted names`,
        AUTODEHOIST_ENABLED: `Enabled autodehoist. **New** users with hoisted names will be renamed`,
        AUTODEHOIST_DISABLED: `Disabled autodehoist. **New** users with hoisted names will no longer be renamed`,
        AT_COMMAND_DESCRIPTION:
          "command that does autotip bot thing but not rn because I got banned",
        AT_CHANNEL_NOT_FOUND: "I could not find the autotip channel.",
        AT_NO_RESPONSE: "Got no response :("
      },
      enabled: true,
    });
  }
}
