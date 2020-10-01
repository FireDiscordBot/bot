import { TextChannel, GuildMember, User } from "discord.js";
import { FireGuild } from "../../lib/extensions/guild";
import { constants } from "../../lib/util/constants";
import { Language } from "../../lib/util/language";

export default class enUS extends Language {
  constructor() {
    super("en-US", {
      language: {
        DEFAULT: (key: string) =>
          `${key} has not been localized for en-US yet.`,
        USER_NOT_FOUND: "User not found! Try use an ID instead.",
        MEMBER_NOT_FOUND: "Member not found! Try use an ID instead.",
        CHANNEL_NOT_FOUND: "Channel not found! Try use an ID instead.",
        INVALID_USER_ID: "User not found! Make sure the ID is valid.",
        INVALID_MEMBER_ID: "Member not found! Make sure the ID is valid.",
        INVALID_CHANNEL_ID: "Channel not found! Make sure the ID is valid.",
        INVALID_MESSAGE:
          "Message not found! Make sure you're giving a valid id/link.",
        UNKNOWN_COMMAND: "Command not found",
        COMMAND_OWNER_ONLY: "Only my owner can use this command",
        COMMAND_ERROR_GENERIC: (id: string) =>
          `Something went wrong while running ${id}`,
        MEMBERS: "Members",
        REGION: "Region",
        STATUS: "Status",
        REGION_DEPRECATED: "❓ Deprecated Region",
        REGIONS: {
          brazil: "🇧🇷 Brazil",
          europe: "🇪🇺 Europe",
          hongkong: "🇭🇰 Hong Kong",
          india: "🇮🇳 India",
          japan: "🇯🇵 Japan",
          russia: "🇷🇺 Russia",
          singapore: "🇸🇬 Singapore",
          southafrica: "🇿🇦 South Africa",
          sydney: "🇦🇺 Sydney",
          "us-central": "🇺🇸 Central US",
          "us-south": "🇺🇸 US South",
          "us-east": "🇺🇸 US East",
          "us-west": "🇺🇸 US West",
        },
        FEATURES: {
          ENABLED_DISCOVERABLE_BEFORE: "Enabled Discoverable Before",
          WELCOME_SCREEN_ENABLED: "Welcome Screen",
          ANIMATED_ICON: "Animated Icon",
          INVITE_SPLASH: "Invite Splash",
          DISCOVERABLE: "[Discoverable](https://discord.com/guild-discovery)",
          MORE_EMOJI: "More Emoji",
          FEATURABLE: "Featurable",
          VANITY_URL: "Vanity URL",
          COMMUNITY: "[Community](https://dis.gd/communityservers)",
          PARTNERED: "[Partnered](https://dis.gd/partners)",
          COMMERCE: "[Store Channels](https://dis.gd/sellyourgame)",
          VERIFIED: "[Verified](https://dis.gd/vfs)",
          BANNER: "Banner",
          NEWS:
            "[Announcement Channels](https://support.discord.com/hc/en-us/articles/360032008192)",
          // CUSTOM FEATURES
          PREMIUM:
            "<:firelogo:665339492072292363> [Premium](https://gaminggeek.dev/premium)",
        },
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
        DEBUG_COMMAND_DESCRIPTION:
          "Command not working? Use this command to try debug the issue.\nDebug command not working? Join the Fire Support server, https://inv.wtf/fire",
        DEBUG_NO_COMMAND: "You must provide a valid command to debug",
        DEBUGGING_DEBUG: "Debug command is working",
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
        DEBUG_ISSUES: (issues: string[]) =>
          issues.length ? `${issues.length} issues found` : "No issues found",
        DESC_COMMAND_DESCRIPTION:
          "Set the description for the server that shows in Vanity URLs",
        DESC_NO_VANITY: (prefix: string) =>
          `You must set a vanity url with \`${prefix}vanityurl\` before you can set a description`,
        DESC_FAILED: "Failed to set guild description.",
        DESC_SET: "Successfully set guild description!",
        DESC_RESET: "Successfully reset guild description!",
        DISCOVER_COMMAND_DESCRIPTION: "Links to Fire's public servers page",
        DISCOVER_MESSAGE: `You can find Fire\'s public server list at <${constants.url.discovery}>
Hint: Use the \`public\` command to get your server on the list`,
        STATUS_LATEST_INCIDENT: "Latest Incident",
        STATUSPAGE_PAGE_DESCRIPTIONS: {
          "all systems operational": "All Systems Operational",
          "partially degraded service": "Partially Degraded Service",
          "minor service outage": "Minor Service Outage",
          "partial system outage": "Partial System Outage",
          "service under maintenance": "Service Under Maintenance",
        },
        STATUSPAGE_INCIDENT_STATUS: {
          investigating: "Investigating",
          identified: "Identified",
          monitoring: "Monitoring",
          resolved: "Resolved",
          scheduled: "Scheduled",
          "in progress": "In Progress",
          verifying: "Verifying",
          completed: "Completed",
          postmortem: "Postmortem",
        },
        STATUSPAGE_COMPONENT_STATUS: {
          operational: "Operational",
          degraded_performance: "Degraded Permormance",
          partial_outage: "Partial Outage",
          major_outage: "Major Outage",
          under_maintenance: "Under Maintenance",
        },
        DSTATUS_COMMAND_DESCRIPTION: "Get Discord's current status",
        DSTATUS_FETCH_FAIL: "Failed to fetch Discord status",
        STATUS_COMMAND_DESCRIPTION: "Get Fire's current status",
        STATUS_FETCH_FAIL: "Failed to fetch Fire status",
        EIGHTBALL_COMMAND_DESCRIPTION: "Ask the Magic 8-Ball a question",
        EIGHTBALL_NO_QUESTION:
          "That doesn't look like a question to me. Are you forgetting something?",
        EIGHTBALL_ANSWER: () => {
          const responses = [
            "It is certain.",
            "It is decidedly so.",
            "Without a doubt.",
            "Yes - definitely.",
            "You may rely on it.",
            "As I see it, yes.",
            "Most likely.",
            "Outlook good.",
            "Yes.",
            "Signs point to yes.",
            "Reply hazy, try again.",
            "Ask again later.",
            "Better not tell you now.",
            "Cannot predict now.",
            "Concentrate and ask again.",
            "Don't count on it.",
            "My reply is no.",
            "My sources say no.",
            "Outlook not so good.",
            "Very doubtful.",
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        },
        GUILD_COMMAND_DESCRIPTION: "Get a general overview of the guild",
        GUILD_CREATED_AT: (guild: FireGuild, created: string) =>
          `**Created by ${
            guild.owner.user.username + guild.owner.user.discriminator ||
            "Unknown#0000"
          } ${created}**`,
        GUILD_JOIN_POS: (pos: number) => `**Your Join Position:** ${pos}`,
        GUILD_VERIF_VERY_HIGH: "**Extreme Verification Level**",
        GUILD_VERIF_HIGH: "**High Verification Level**",
        GUILD_VERIF_MEDIUM: "**Medium Verification Level**",
        GUILD_VERIF_LOW: "**Low Verification Level**",
        GUILD_VERIF_NONE: "**No Verification!**",
        GUILD_FILTER_ALL: "**Content Filter:** All Members",
        GUILD_FILTER_NO_ROLE: "**Content Filter:** Without Role",
        GUILD_FILTER_NONE: "**Content Filter:** Disabled",
        GUILD_NOTIFS_MENTIONS: "**Default Notifications:** Only @Mentions",
        GUILD_NOTIFS_ALL: "**Default Notifications:** All Messages",
        GUILD_MFA_ENABLED: "**Two-Factor Auth:** Enabled",
        GUILD_MFA_NONE: "**Two-Factor Auth:** Disabled",
        GUILD_ABOUT: "» About",
        GUILD_SECURITY: "» Security",
        GUILD_FEATURES: "» Features",
        GUILD_ROLES: "» Roles",
        HELP_COMMAND_DESCRIPTION:
          "Lists all of Fire's commands and provides information about them",
        HELP_FOOTER: (prefix: string) =>
          `Use "${prefix}help <command>" for more info about the command`,
        SK1ER_NO_REUPLOAD: (user: GuildMember | User) =>
          `${user} I am unable to read your log to remove sensitive information & provide solutions to your issue. Please upload the log directly :)`,
        SK1ER_REUPLOAD_FETCH_FAIL: (domain: string) =>
          `I was unable to read your log. Please upload it directly rather than using ${domain}`,
        SK1ER_LOG_READ_FAIL:
          "I was unable to read the attachment, try reupload it. If it still doesn't work, yell at Geek :)",
        SK1ER_MODCORE_ZIP: (user: GuildMember | User) =>
          `${user}, Unzip this in \`.minecraft/modcore\` and your issue should be resolved.`,
        SK1ER_LOG_HASTE: (
          user: GuildMember | User,
          msgType: string,
          extra: string,
          haste: string,
          solutions: string
        ) => `${user} ${msgType} a log, ${extra}\n${haste}\n\n${solutions}`,
        INVITE_COMMAND_DESCRIPTION: "Sends a link to invite me to a different Discord server.",
        PING_COMMAND_DESCRIPTION: "Shows you my ping to discord's servers",
        PING_INITIAL_MESSAGE: "Pinging...",
        PLONK_COMMAND_DESCRIPTION:
          "make a user unable to use the best discord bot",
      },
      enabled: true,
    });
  }
}
