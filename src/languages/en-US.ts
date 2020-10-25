import { FireMember } from "../../lib/extensions/guildmember";
import { FireGuild } from "../../lib/extensions/guild";
import { FireUser } from "../../lib/extensions/user";
import { constants } from "../../lib/util/constants";
import { Language } from "../../lib/util/language";
import { TextChannel } from "discord.js";

export default class enUS extends Language {
  constructor() {
    super("en-US", {
      language: {
        // Remove DEFAULT if adding a new language
        DEFAULT: (key: string) =>
          `${key} has not been localized for any languages yet.`,
        USER_NOT_FOUND: "User not found! Try use an ID instead.",
        MEMBER_NOT_FOUND: "Member not found! Try use an ID instead.",
        CHANNEL_NOT_FOUND: "Channel not found! Try use an ID instead.",
        ROLE_NOT_FOUND: "Role not found! Try use an ID instead.",
        INVALID_USER_ID: "User not found! Make sure the ID is valid.",
        INVALID_MEMBER_ID: "Member not found! Make sure the ID is valid.",
        INVALID_CHANNEL_ID: "Channel not found! Make sure the ID is valid.",
        INVALID_ROLE_ID: "Role not found! Make sure the ID is valid.",
        INVALID_MESSAGE:
          "Message not found! Make sure you're giving a valid id/link.",
        UNKNOWN_COMMAND: "Command not found",
        COMMAND_OWNER_ONLY: "Only my owner can use this command",
        COMMAND_PREMIUM_ONLY:
          "Only premium guilds can use this command. Learn more at https://inv.wtf/premium",
        COMMAND_ERROR_GENERIC: (id: string) =>
          `Something went wrong while running ${id}`,
        NO_MODERATORS_SET: "There are no moderators set in this guild.",
        MORE_INTEGRATIONS:
          "Want more integrations? Use the suggest command to suggest some!",
        MEMBERS: "Members",
        REGION: "Region",
        STATUS: "Status",
        UUID: "UUID",
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
        PERMISSIONS: {
          CREATE_INSTANT_INVITE: "Create Invite",
          KICK_MEMBERS: "Kick Members",
          BAN_MEMBERS: "Ban Members",
          ADMINISTRATOR: "Administrator",
          MANAGE_CHANNELS: "Manage Channels",
          MANAGE_GUILD: "Manage Server",
          ADD_REACTIONS: "Add Reactions",
          VIEW_AUDIT_LOG: "View Audit Log",
          PRIORITY_SPEAKER: "Priority Speaker",
          STREAM: "Video",
          VIEW_CHANNEL: "Read Messages",
          SEND_MESSAGES: "Send Messages",
          SEND_TTS_MESSAGES: "Send TTS Messages",
          MANAGE_MESSAGES: "Manage Messages",
          EMBED_LINKS: "Embed Links",
          ATTACH_FILES: "Attach Files",
          READ_MESSAGE_HISTORY: "Read Message History",
          MENTION_EVERYONE: "Mention @everyone, @here and All Roles",
          USE_EXTERNAL_EMOJIS: "Use External Emojis",
          VIEW_GUILD_INSIGHTS: "View Server Insights",
          CONNECT: "Connect",
          SPEAK: "Speak",
          MUTE_MEMBERS: "Mute Members (voice)",
          DEAFEN_MEMBERS: "Deafen Members",
          MOVE_MEMBERS: "Move Members",
          USE_VAD: "Use Voice Activity",
          CHANGE_NICKNAME: "Change Nickname",
          MANAGE_NICKNAMES: "Manage Nicknames",
          MANAGE_ROLES: "Manage Roles",
          MANAGE_WEBHOOKS: "Manage Webhooks",
          MANAGE_EMOJIS: "Manage Emojis",
        },
        MISSING_PERMISSIONS_USER: (permissions: string[], command: string) =>
          `You are missing ${permissions.join(
            ", "
          )} permission(s) to run ${command}.`,
        MISSING_PERMISSIONS_CLIENT: (permissions: string[], command: string) =>
          `I am missing ${permissions.join(
            ", "
          )} permission(s) to run ${command}.`,
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
        ADDMOD_COMMAND_DESCRIPTION:
          "Add a member/role as a moderator. If not set, anyone with the Manage Messages permission is considered a moderator",
        MODERATORS_ROLES: "Moderator Roles",
        NO_MODERATOR_ROLES: "No roles have been set as moderators.",
        MODERATORS_MEMBERS: "Moderator Members",
        NO_MODERATOR_MEMBERS: "No members have been set as moderators.",
        MODERATORS_REMOVE_INVALID: "Invalid Moderators",
        MODERATORS_REMOVED: (invalid: string[]) =>
          `I have removed some moderators as a matching role/member could not be found...\nThe removed ids are: ${invalid.join(
            ", "
          )}`,
        AUTODECANCER_COMMAND_DESCRIPTION: `Toggle renaming those with "cancerous" (non-ascii) names`,
        AUTODECANCER_ENABLED: `Enabled autodecancer. **New** users with "cancerous" (non-ascii) names will be renamed`,
        AUTODECANCER_DISABLED: `Disabled autodecancer. **New** users with "cancerous" (non-ascii) names will no longer be renamed`,
        AUTODEHOIST_COMMAND_DESCRIPTION:
          "Toggle renaming those with hoisted names",
        AUTODEHOIST_ENABLED:
          "Enabled autodehoist. **New** users with hoisted names will be renamed",
        AUTODEHOIST_DISABLED:
          "Disabled autodehoist. **New** users with hoisted names will no longer be renamed",
        AVATAR_COMMAND_DESCRIPTION: "Get a user's avatar",
        BADNAME_COMMAND_DESCRIPTION:
          "Change the name used for auto dehoist/decancer",
        BADNAME_NO_CHANGES: `I did absolutely nothing because that's already set as the "bad name"`,
        BADNAME_SET: (name: string) =>
          `I have set the "bad name" to \"${name}\". This will **not** rename existing users`,
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
          degraded_performance: "Degraded Performance",
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
        EVAL_COMMAND_DESCRIPTION: "run epic gamer code",
        EVAL_TOO_LONG: (haste?: string) =>
          haste
            ? `Output was too long, uploaded to hastebin; ${haste}`
            : `Output was too long, failed to upload to hastebin`,
        GUILD_COMMAND_DESCRIPTION: "Get a general overview of the guild",
        GUILD_CREATED_AT: (guild: FireGuild, created: string) =>
          `**Created by ${
            guild.owner.user.discriminator != null
              ? guild.owner
              : "Unknown#0000"
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
        HELP_FOOTER: (prefix: string, cluster: number) =>
          `Use "${prefix}help <command>" for more info about the command | Cluster ID: ${cluster}`,
        SK1ER_NO_REUPLOAD: (user: FireMember | FireUser) =>
          `${user} I am unable to read your log to remove sensitive information & provide solutions to your issue. Please upload the log directly :)`,
        SK1ER_REUPLOAD_FETCH_FAIL: (domain: string) =>
          `I was unable to read your log. Please upload it directly rather than using ${domain}`,
        SK1ER_LOG_READ_FAIL:
          "I was unable to read the attachment, try reupload it. If it still doesn't work, yell at Geek :)",
        SK1ER_MODCORE_ZIP: (user: FireMember | FireUser, zip: string) =>
          `${user}, Download the zip from ${zip} and then unzip it in \`.minecraft/modcore\` and your issue should be resolved.`,
        SK1ER_LOG_HASTE: (
          user: FireMember | FireUser,
          msgType: string,
          extra: string,
          haste: string,
          solutions: string
        ) => `${user} ${msgType} a log, ${extra}\n${haste}\n\n${solutions}`,
        INVITE_COMMAND_DESCRIPTION:
          "Sends a link to invite me to a different Discord server.",
        LANGUAGE_COMMAND_DESCRIPTION:
          "Set the language Fire uses. You can add/improve languages on the GitHub repo, https://inv.wtf/github",
        LANGUAGE_COMMAND_CURRENT: (
          language: string // should always say it in the current language
        ) =>
          `The current language is ${language}. You can set the language to any of the following...\n${this.client.languages.modules
            .keyArray()
            .join(
              ", "
            )}\n\nNote: Some languages may be unfinished so sometimes you'll see some English if the string hasn't been translated`,
        LANGUAGE_COMMAND_HELLO:
          "Hello! You have successfully set Fire's language to English (US) :D",
        LEVELHEAD_COMMAND_DESCRIPTION: "Get a player's levelhead info",
        LEVELHEAD_NO_PLAYER:
          "You need to give a player for me to check the levelhead of",
        LEVELHEAD_FETCH_FAIL: "Failed to fetch levelhead info",
        LEVELHEAD_MALFORMED_UUID:
          "Malformed UUID. Check the spelling of the player's name",
        LEVELHEAD_PURCHASED: "Purchased",
        LEVELHEAD_NOT_PURCHASED: "Not Purchased",
        LEVELHEAD_EMBED_TITLE: (player: string) => `${player}'s Levelhead`,
        LEVELHEAD_PROPOSED: "Proposed Levelhead",
        LEVELHEAD_DENIED: "Denied",
        LEVELHEAD_OTHER: "Other Items",
        LEVELHEAD_TAB: "Tab",
        LEVELHEAD_CHAT: "Chat",
        LEVELHEAD_ADDON_LAYERS: "Addon Head Layers",
        MODONLY_COMMAND_DESCRIPTION:
          "Set channels to restrict commands for moderators",
        MODONLY_NO_CHANNELS:
          "You must provide valid channel(s) separated by a comma or space for me to toggle moderator only mode in.",
        MODONLY_SET: (channels: string) =>
          `Commands can now only be run by moderators (either those set as mods or those with manage messages) in;\n${channels}.`,
        MODONLY_RESET: "Moderator only channels have been reset",
        ADMINONLY_COMMAND_DESCRIPTION:
          "Set channels to restrict commands for admins",
        ADMINONLY_NO_CHANNELS:
          "You must provide valid channel(s) separated by a comma or space for me to toggle admin only mode in.",
        ADMINONLY_SET: (channels: string) =>
          `Commands can now only be run by those with the "Manage Server" permission in;\n${channels}.`,
        ADMINONLY_RESET: "Admin only channels have been reset",
        MCSTATUS_COMMAND_DESCRIPTION: "Check the status of Minecraft services",
        MCSTATUS_FETCH_FAIL: "Failed to fetch Minecraft status",
        MCSTATUS_STATUSES: {
          green: "No Issues",
          yellow: "Some Issues",
          red: "Service Unavailable",
        },
        MCSTATUS_SERVICES: {
          "minecraft.net": "**Website**",
          "sessionserver.mojang.com": "**Sessions**",
          "authserver.mojang.com": "**Auth**",
          "textures.minecraft.net": "**Skins**",
          "api.mojang.com": "**API**",
        },
        MCUUID_COMMAND_DESCRIPTION:
          "Get a player's UUID (use --dashed to get the uuid with dashes)",
        MCUUID_INVALID_IGN: "You must provide a valid IGN to get the UUID of",
        MCUUID_FETCH_FAIL:
          "Failed to fetch the UUID, make sure the IGN is a valid player",
        MCUUID_UUID: (ign: string, uuid: string) =>
          `${ign} has the UUID ${uuid}`,
        MOD_COMMAND_DESCRIPTION: "Get information about a Sk1er LLC mod",
        MOD_INVALID: "You must provide a valid mod",
        MODCORE_COMMAND_DESCRIPTION: "Get a player's modcore profile",
        MODCORE_INVALID_IGN:
          "You must provide a valid IGN to get the ModCore profile of",
        MODCORE_PROFILE_FETCH_FAIL: "Failed to fetch that player's profile",
        MODCORE_PROFILE_TITLE: (player: string) =>
          `${player}'s ModCore Profile`,
        MODCORE_ENABLED_COSMETICS: "Enabled Cosmetics",
        MODCORE_NO_COSMETICS: "No Cosmetics",
        PING_COMMAND_DESCRIPTION: "Shows you my ping to discord's servers",
        PING_INITIAL_MESSAGE: "Pinging...",
        PING_FOOTER: (shard: number, cluster: number) =>
          `Shard ID: ${shard} | Cluster ID: ${cluster}`,
        PING_FINAL_MESSAGE: "Pong!",
        PLONK_COMMAND_DESCRIPTION:
          "make a user unable to use the best discord bot",
        RELOAD_COMMAND_DESCRIPTION: "reload a command/language/listener/module",
      },
      enabled: true,
    });
  }
}
