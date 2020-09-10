import { constants } from "../../lib/util/constants";
import { Language } from "../../lib/util/language";
import { TextChannel } from "discord.js";

export default class OwO extends Language {
  constructor() {
    super("owo-UwU", {
      language: {
        DEFAULT: (key: string) =>
          `${key} has not been wocawized fow owo yet.`,
        USER_NOT_FOUND: "Usew not fouwnd :(",
        UNKNOWN_COMMAND: "Command not fouwnd",
        COMMAND_OWNER_ONLY: "Onwy my ownew can uwse this command",
        AT_COMMAND_DESCRIPTION:
          "command that does auwtotip bot thing buwt not wn becauwse i got banned",
        AT_CHANNEL_NOT_FOUND: "I couwwd not find the auwtotip channew.",
        AT_NO_RESPONSE: "Got no wesponse :(",
        AUTODECANCER_COMMAND_DESCRIPTION: `Toggwe wenaming those with "cancewouws" (non-ascii) names`,
        AUTODECANCER_ENABLED: `Enabwed auwtodecancew. **new** uwsews with "cancewouws" (non-ascii) names wiww be wenamed`,
        AUTODECANCER_DISABLED: `Disabwed auwtodecancew. **new** uwsews with "cancewouws" (non-ascii) names wiww no wongew be wenamed`,
        AUTODEHOIST_COMMAND_DESCRIPTION: `Toggwe wenaming those with hoisted names`,
        AUTODEHOIST_ENABLED: `Enabwed auwtodehoist. **new** uwsews with hoisted names wiww be wenamed`,
        AUTODEHOIST_DISABLED: `Disabwed auwtodehoist. **new** uwsews with hoisted names wiww no wongew be wenamed`,
        AVATAR_COMMAND_DESCRIPTION: "Get a uwsew's avataw",
        BADNAME_COMMAND_DESCRIPTION:
          "Change the name uwsed fow auwto dehoist/decancew",
        BADNAME_NO_CHANGES: `I did absowuwtewy nothing becauwse that's awweady set as the "bad name"`,
        BADNAME_SET: (name: string) =>
          `I have set the "bad name" to ${name}. This wiww **not** wename existing uwsews`,
        BADNAME_RESET: `I have weset the "bad name" to John Doe 0000 (with 0000 being theiw discwiminatow).
 this wiww **not** wename existing uwsews`,
        DEBUG_NO_COMMAND: "Youw muwst pwovide a vawid command to debuwg",
        DEBUGGING_DEBUG: "Debuwg command is wowking",
        DEBUG_PERMS_PASS: "No pewmissions missing",
        DEBUG_PERMS_CHECKS_FAIL: "Pewmission checks faiwed!",
        DEBUG_PERMS_FAIL: (userMissing: string[], clientMissing: string[]) => {
          return {
            user: userMissing.length
              ? `Youw awe missing the pewmission${
                  userMissing.length > 1 ? "s" : ""
                } ${userMissing.join(", ")}`
              : null,
            client: clientMissing.length
              ? `I am missing the pewmission${
                  clientMissing.length > 1 ? "s" : ""
                } ${clientMissing.join(", ")}`
              : null,
          };
        },
        DEBUG_COMMAND_DISABLE_BYPASS:
          "Command is disabwed buwt u awe bypassed",
        DEBUG_COMMAND_DISABLED: "Command is disabwed.",
        DEBUG_COMMAND_NOT_DISABLED: "Command is not disabwed",
        DEBUG_MUTE_BYPASS: (channel: TextChannel, bypass: string[]) =>
          `The fowwowing uwsews/wowes wiww bypass muwtes in ${channel}\n${bypass.join(
            ", "
          )}`,
        DEBUG_MUTE_NO_BYPASS: (channel: TextChannel) =>
          `Nobody can bypass muwtes in ${channel}`,
        DEBUG_NO_EMBEDS: "I cannot send embeds",
        PING_COMMAND_DESCRIPTION: "Shows you my ping to discowd's sewvews",
        PING_INITIAL_MESSAGE: "Pinging...",
      },
      enabled: true,
    });
  }
}
