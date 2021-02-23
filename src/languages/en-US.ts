import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";

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
        INVALID_SNOWFLAKE:
          "User not found and argument is not a valid snowflake. Try using an ID if you want to find a user.",
        INVALID_MEMBER_ROLE_CHANNEL:
          "That is not a valid member, role or channel. Make sure the name or ID you're providing is valid.",
        INVALID_MESSAGE:
          "Message not found! Make sure you're giving a valid ID/link. If giving an ID, it must be from this channel.",
        PREVIEW_NOT_FOUND:
          "Preview not found for that ID, make sure the guild is discoverable and the ID is valid",
        PREVIEW_NOT_DISCOVERABLE:
          "Preview found for that ID but it is not considered public (discoverable/public command) therefore I cannot show it",
        HASTE_INVALID_DOMAIN: (supported: string) =>
          `That is not a valid haste domain. Currently supported domains are ${supported}.`,
        HASTE_INVALID_URL: "That doesn't seem to be a valid haste URL.",
        HASTE_FETCH_FAILED: "I failed to fetch the content of that haste",
        UNKNOWN_COMMAND: "Command not found",
        COMMAND_OWNER_ONLY: "Only my owner can use this command",
        COMMAND_SUPERUSER_ONLY:
          "Only a select few are powerful enough to use this command",
        COMMAND_MODERATOR_ONLY:
          "Only those strong enough to wield the ban hammer (moderators) can use this command",
        COMMAND_GUILD_ONLY: (invite: string) =>
          `You can only use this command in a server. You can invite me to a server at <${invite}>`,
        COMMAND_PREMIUM_GUILD_ONLY:
          "Only premium guilds can use this command. Learn more at https://inv.wtf/premium",
        COMMAND_PREMIUM_USER_ONLY:
          "Only users with a current premium subscription can use this command. Learn more at https://inv.wtf/premium",
        COMMAND_EXPERIMENT_REQUIRED: "The maze wasn't meant for you.",
        COMMAND_ACCOUNT_TOO_YOUNG:
          "Your account has been created too recently!",
        COMMAND_GUILD_LOCKED:
          "This command is restricted to certain guilds and this guild is not one of them.",
        COMMAND_ERROR_CONCURRENCY:
          // For different languages, you may want to change the "hold your horses" bit as it may not make sense in that language
          "Whoa, hold your horses! Wait for the command to finish before running it again",
        COMMAND_ERROR_COOLDOWN:
          "This command is on cooldown, please wait a bit before running it again",
        COMMAND_ERROR_CACHE: "Something went wrong while checking my cache",
        COMMAND_ERROR_GENERIC: (id: string) =>
          `Something went wrong while running ${id}`,
        SLASH_COMMAND_HANDLE_FAIL: "I failed to handle that slash command",
        // this is used when it'd react with the success emoji
        // but you can't react to the slash command message when responding
        // with no source or the source message isn't found
        SLASH_COMMAND_HANDLE_SUCCESS: "Command ran successfully!",
        SLASH_COMMAND_BOT_REQUIRED: (invite: string) =>
          `This command requires you to be in a server & have the bot present. You can invite it @ <${invite}>`,
        USER_SNOWFLAKE_ARGUMENT_DESCRIPTION:
          "A mention, username, user id or any valid snowflake",
        HELLO_PREFIX: (prefix: string) =>
          `Hey! My prefix here is \`${prefix}\` or you can mention me :)`,
        ERROR_ROLE_UNUSABLE:
          "This role cannot be used as it is either managed by an integration, higher than my top role or the default role.",
        ERROR_NO_KSOFT:
          "Unable to use KSoft.Si API due to lack of authentication",
        NO_MODERATORS_SET: "There are no moderators set in this guild.",
        MORE_INTEGRATIONS:
          "Want more integrations? Use the suggest command to suggest some!",
        RAW: "Raw",
        AGO: " ago", // Used for dates, e.g. 20 seconds ago. Make sure to keep the space at the start
        FROM_NOW: " from now", // Also used for dates, e.g. 20 seconds from now.
        UUID: "UUID",
        DATE: "Date",
        TYPE: "Type",
        NAME: "Name",
        ROLE: "Role",
        ICON: "Icon",
        UNTIL: "Until",
        AFTER: "After",
        TOPIC: "Topic",
        LINKS: "Links",
        ABOUT: "About",
        ROLES: "Roles",
        NOTES: "Notes",
        TITLE: "Title",
        STATS: "Stats",
        GUILD: "Guild",
        EMOJI: "Emoji",
        ERROR: "Error",
        USERS: "Users",
        OWNER: "Owner",
        BEFORE: "Before",
        CLICKS: "Clicks",
        GUILDS: "Guilds",
        INVITE: "Invite",
        STATUS: "Status",
        REGION: "Region",
        REASON: "Reason",
        JOINED: "Joined",
        ONLINE: "Online",
        CHANNEL: "Channel",
        MESSAGE: "Message",
        SUBJECT: "Subject",
        MEMBERS: "Members",
        WARNING: "Warning",
        MENTION: "Mention",
        CREATED: "Created",
        JUMP_URL: "Jump URL",
        NICKNAME: "Nickname",
        CHANNELS: "Channels",
        CATEGORY: "Category",
        SLOWMODE: "Slowmode",
        ACTIVITY: "Activity",
        NO_TOPIC: "No Topic",
        DM_CHANNEL: "Our DMs",
        VARIABLES: "Variables",
        TIMESTAMP: "Timestamp",
        WORKER_ID: "Worker ID",
        INCREMENT: "Increment",
        MODERATOR: "Moderator",
        ATTACHMENT: "Attachment",
        PROCESS_ID: "Process ID",
        STATISTICS: "Statistics",
        CUSTOM_URL: "Custom URL",
        PINNED_BY: "Pinned By",
        INVITED_BY: "Invited By",
        CREATED_BY: "Created By",
        DELETED_BY: "Deleted By",
        VIEWABLE_BY: "Viewable By",
        ATTACHMENTS: "Attachments",
        DESCRIPTION: "Description",
        INVITE_USED: "Invite Used",
        CREATED_GUILD: "Created Guild",
        JOIN_POSITION: "Join Position",
        CLICK_TO_VIEW: "Click To View", // message/attachment link
        ADDED_FEATURES: "Added Features",
        SYSTEM_CHANNEL: "System Channel",
        ACCOUNT_CREATED: "Account Created",
        REMOVED_FEATURES: "Removed Features",
        ADDED_OVERWRITES: "Added Permissions",
        VERIFICATION_LEVEL: "Verification Level",
        REMOVED_OVERWRITES: "Removed Permissions",
        EXPLICIT_CONTENT_FILTER: "Explicit Content Filter",
        REGION_DEPRECATED:
          "<:wumpus_land:759529118671831040> Deprecated Region",
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
        KEY_PERMISSIONS: "Key Permissions",
        PERMISSIONS_TEXT: "Permissions",
        PERMISSIONS: {
          // If possible, use the translations from the Discord client here
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
          MENTION_EVERYONE:
            "Mention @\u200beveryone, @\u200bhere and All Roles",
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
        ACTIVITY_TYPES: {
          1: "Join",
          2: "Spectate",
          3: "Listen",
          5: "Join Request",
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
        POWERED_BY_KSOFT: "Powered by KSoft.Si API",
        ANTI_COMMAND_DESCRIPTION:
          "Remove messages containing certain content e.g. @everyone or zero width spaces",
        ANTI_EVERYONE:
          "Delete messages with @everyone & @here from those without permission to use them",
        ANTI_ZWS:
          "Delete messages including zero width spaces sent by non-moderators",
        ANTI_SPOILER:
          'Delete messages containing "spoiler abuse" (using many spoilers to mask content, typically used to hide links)',
        ANTI_SELFBOT: "Delete messages from selfbots (embeds from users)",
        ANTI_CURRENT_OPTIONS: (
          options: [string, boolean][]
        ) => `**__Current Message Filters__**
 
${options
  .map(([name, enabled]) =>
    enabled
      ? `${constants.emojis.success} ${name}`
      : `${constants.emojis.error} ${name}`
  )
  .join("\n")}`,
        ANTI_EVERYONE_DISABLED:
          "I will no longer delete messages containing @everyone or @here",
        ANTI_EVERYONE_ENABLED:
          "I will now delete messages containing @everyone or @here if they lack the permission to use it",
        ANTI_ZWS_DISABLED:
          "I will no longer delete messages containing zero width spaces sent by non-moderators",
        ANTI_ZWS_ENABLED:
          "I will now delete messages containing zero width spaces sent by non-moderators",
        ANTI_SPOILER_DISABLED:
          'I will no longer delete messages containing "spoiler abuse" (using many spoilers to mask content, typically used to hide links)',
        ANTI_SPOILER_ENABLED:
          'I will now delete messages containing "spoiler abuse" (using many spoilers to mask content, typically used to hide links)',
        ANTI_SELFBOT_DISABLED:
          "I will no longer delete messages from selfbots (embeds from users)",
        ANTI_SELFBOT_ENABLED:
          "I will now delete messages from selfbots (embeds from users)",
        ANTI_UNKNOWN: (valid: string[]) =>
          `That is not a valid filter. Current filters are ${valid.join(", ")}`,
        AUDIT_ACTION_MEMBER_BAN_ADD: "Banned",
        AUDIT_ACTION_MEMBER_KICK: "Kicked",
        AUDIT_ACTION_BY: (action: string) => `${action} By`, // e.g. Kicked By or Banned By
        ALIAS_COMMAND_DESCRIPTION:
          "it do thing and make user be different name ok yes cool",
        ALIAS_REQUIRED_ARG:
          "hey idiot you forgot to give an alias to add/remove from that user",
        ADDMOD_COMMAND_DESCRIPTION:
          "Add a member/role as a moderator. If not set, anyone with the Manage Messages permission is considered a moderator",
        AUTOROLE_COMMAND_DESCRIPTION:
          "Automatically add a role to a user/bot when they join/send their first message",
        AUTOROLE_ROLE_REQUIRED:
          "You can't automatically give nothing, you need to provide a role",
        AUTOROLE_INVALID_FLAGS: "You cannot combine --bot and --delay",
        AUTOROLE_DISABLED:
          "Autorole has been disabled, users will no longer receive a role upon join/first message.",
        AUTOROLE_DISABLED_BOT:
          "Autorole has been disabled, bots will no longer receive a role upon join.",
        AUTOROLE_ENABLED: (role: string, delay: boolean) =>
          `Autorole has been enabled, users will receive ${role} upon ${
            delay ? "first message" : "join"
          }.`,
        AUTOROLE_ENABLED_BOT: (role: string, delay: boolean) =>
          `Autorole has been enabled, bots will receive ${role} upon join.`,
        AUTOROLE_REASON: "Adding autorole",
        MODERATORS_ROLES: "Moderator Roles",
        NO_MODERATOR_ROLES: "No roles have been set as moderators.",
        MODERATORS_MEMBERS: "Moderator Members",
        NO_MODERATOR_MEMBERS: "No members have been set as moderators.",
        MODERATORS_REMOVE_INVALID: "Invalid Moderators",
        MODERATORS_REMOVED: (invalid: string[]) =>
          `I have removed some moderators as a matching role/member could not be found...\nThe removed ids are: ${invalid.join(
            ", "
          )}`,
        AUTODECANCER_COMMAND_DESCRIPTION:
          'Toggle renaming those with "cancerous" (non-ascii) names',
        AUTODECANCER_ENABLED:
          'Enabled autodecancer. **New** users with "cancerous" (non-ascii) names will be renamed',
        AUTODECANCER_DISABLED:
          'Disabled autodecancer. **New** users with "cancerous" (non-ascii) names will no longer be renamed',
        AUTODECANCER_REASON:
          "Name changed due to auto-decancer. The name contains non-ascii characters",
        AUTODECANCER_RESET_REASON: "Name is fully ascii.",
        AUTODECANCER_USERNAME_REASON:
          "Nickname is non-ascii whereas username is, removing nickname.",
        AUTODEHOIST_COMMAND_DESCRIPTION:
          "Toggle renaming those with hoisted names",
        AUTODEHOIST_ENABLED:
          "Enabled autodehoist. **New** users with hoisted names will be renamed",
        AUTODEHOIST_DISABLED:
          "Disabled autodehoist. **New** users with hoisted names will no longer be renamed",
        AUTODEHOIST_REASON:
          "Name changed due to auto-dehoist. The name starts with a hoisted character",
        AUTODEHOIST_RESET_REASON: "Name is no longer hoisted.",
        AUTODEHOIST_USERNAME_REASON:
          "Nickname is hoisted whereas username is not, removing nickname.",
        AVATAR_COMMAND_DESCRIPTION: "Get a user's avatar",
        AVATAR_TITLE: (user: string) => `${user}'s avatar`,
        BADNAME_COMMAND_DESCRIPTION:
          "Change the name used for auto dehoist/decancer",
        BADNAME_NO_CHANGES: `I did absolutely nothing because that's already set as the "bad name"`,
        BADNAME_SET: (name: string) =>
          `I have set the "bad name" to \"${name}\". This will **not** rename existing users`,
        BADNAME_RESET: `I have reset the "bad name" to John Doe 0000 (with 0000 being their discriminator).
This will **not** rename existing users`,
        BAN_LOG_AUTHOR: (user: string) => `Ban | ${user}`,
        BAN_DM: (guild: string, reason: string) =>
          `You were banned from ${guild} for "${reason}"`,
        BAN_DM_FAIL: "Unable to DM user, they may have DMs off or blocked me",
        BAN_SUCCESS: (user: string, guild: string) =>
          `${constants.emojis.success} **${user}** has been banished from ${guild}.`,
        BAN_SEMI_SUCCESS: (user: string, guild: string) =>
          `${constants.emojis.warning} **${user}** has been banished from ${guild} but I was unable to save it in my database meaning they may not be unbanned when it expires, depending on the length of the ban.`,
        BAN_FAILED_ENTRY:
          "Failed to create mod log entry, user was not banned.",
        BAN_FAILED_BAN: "Failed to ban user, please try again.",
        BAN_FAILED_BAN_AND_ENTRY:
          "Failed to ban user and was unable to delete the created mod log entry.",
        BAN_COMMAND_DESCRIPTION:
          "Ban a user from the server. Use the --days flag to delete message history",
        BAN_USER_REQUIRED: "You must provide a user to ban!",
        BAN_INVALID_DAYS: "Days must be a number from 1 to 7",
        BAN_FAILED_PARSE_TIME: "I was unable to parse the time in your message",
        BAN_TIME_TOO_SHORT:
          "That time is too short! It must be at least 30 minutes",
        BAN_MEMBER_REQUIRED: "You can only tempban an existing member",
        BAN_MUTED_REASON:
          "User is about to be banned, mute will no longer be needed",
        BLOCK_LOG_AUTHOR: (blockee: string) => `Block | ${blockee}`,
        BLOCK_SUCCESS: (blockee: string) =>
          `${constants.emojis.success} **${blockee}** has been blocked.`,
        BLOCK_FAILED_ENTRY:
          "Failed to create mod log entry, user/role was not blocked.",
        BLOCK_FAILED_BLOCK: "Failed to block user/role, please try again.",
        BLOCK_FAILED_BLOCK_AND_ENTRY:
          "Failed to block user and was unable to delete the created mod log entry.",
        BLOCK_COMMAND_DESCRIPTION:
          "Block a user or role from chatting in the current channel",
        BLOCK_ARG_REQUIRED:
          "You must provide a user or role to block from chatting in the current channel!",
        CARBON_COMMAND_DESCRIPTION:
          "Create and share beautiful images of your code.",
        CARBON_NOT_READY:
          "Seems some environment variables are missing or I am not connected to Aether. This should *rarely* happen in production but if it does, wait a few minutes and try again",
        CARBON_CODE_REQUIRED:
          'You must provide code in a codeblock to generate an image from, "listthemes" to list valid themes or "listfonts" to list valid fonts',
        CARBON_IMAGE_FAILED: "Failed to generate image!",
        CHANNELCREATELOG_AUTHOR: (type: string, guild: string) =>
          `${
            type.charAt(0).toUpperCase() + type.toLowerCase().slice(1)
          } Channel Create | ${guild}`,
        CHANNELCREATELOG_MUTE_PERMS_FAIL: `I was unable to set permissions for the muted role in this channel, users may be able to bypass mutes here.
Make sure I have permission to manage roles`,
        CHANNELDELETELOG_AUTHOR: (type: string, guild: string) =>
          `${
            type.charAt(0).toUpperCase() + type.toLowerCase().slice(1)
          } Channel Delete | ${guild}`,
        CHANNELUPDATELOG_AUTHOR: (type: string, channel: string) =>
          `${
            type.charAt(0).toUpperCase() + type.toLowerCase().slice(1)
          } Channel Update | ${channel}`,
        COLOR_COMMAND_DESCRIPTION: "Get information about a color",
        COLOR_ARGUMENT_INVALID: (random: string) =>
          `That does not seem to be a valid color, maybe try ${random}`,
        COLOR_HEADING: (color: string) =>
          `Information about the color **${color}**`,
        COMMAND_COMMAND_DESCRIPTION: "Enable/disable a command in your server",
        COMMAND_DISABLE_FORBIDDEN: "You cannot disable this command!",
        COMMAND_ENABLE: (command: string) => `Successfully enabled ${command}!`,
        COMMAND_DISABLE: (command: string) =>
          `Successfully disabled ${command}, only moderators can use it now.`,
        COMMAND_NO_ARG: "You need to provide a command to toggle",
        DEBUG_COMMAND_DESCRIPTION:
          "Command not working? Use this command to try debug the issue",
        DEBUG_NO_COMMAND: "You must provide a valid command to debug",
        DEBUGGING_DEBUG: "Debug command is working",
        DEBUG_PERMS_PASS: "No permissions missing",
        DEBUG_REQUIRES_PERMS:
          "This command requires extra permissions. You'll need to debug in a server to see permission info",
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
        DEBUG_MUTE_BYPASS: (channel: string, bypass: string[]) =>
          `The following users/roles will bypass mutes in ${channel}\n${bypass.join(
            ", "
          )}`,
        DEBUG_MUTE_NO_BYPASS: (channel: string) =>
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
        DEEPFRY_COMMAND_DESCRIPTION:
          "Deepfry an image or your avatar (your avatar is used if no argument is provided)",
        DEEPFRY_UPLOAD_FAIL: "Deepfry machine broke :(",
        DISCOVER_COMMAND_DESCRIPTION: "Links to Fire's public servers page",
        DISCOVER_MESSAGE: `You can find Fire\'s public server list at <${constants.url.discovery}>
Hint: Use the \`public\` command to get your server on the list`,
        DERANK_LOG_AUTHOR: (user: string) => `Derank | ${user}`,
        DERANK_SUCCESS: (user: string) =>
          `${constants.emojis.success} **${user}** has been deranked.`,
        DERANK_FAILED: (user: string, roles: string) =>
          `${constants.emojis.warning} **${user}** has been partially deranked as I failed to remove ${roles}`,
        DERANK_FAILED_TO_REMOVE: "Failed to remove",
        DERANK_FAILED_ENTRY:
          "Failed to create mod log entry, user was not deranked.",
        DERANK_FAILED_DERANK: "Failed to derank user, please try again.",
        DERANK_FAILED_DERANK_AND_ENTRY:
          "Failed to derank user (although some roles may have been removed) and was unable to delete the created mod log entry.",
        DERANK_COMMAND_DESCRIPTION: "Remove all roles from a user",
        DERANK_USER_REQUIRED: "You must provide a user to derank!",
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
        EMBED_COMMAND_DESCRIPTION:
          "Send a custom embed to a channel with a haste link containing an embed",
        EMBED_MISSING_PERMISSIONS:
          "You must have the `Manage Messages` permission in the channel you wish to send an embed in if a channel is provided",
        EMBED_OBJECT_INVALID:
          "That doesn't seem to be a valid embed, try using https://gaminggeek.dev/embed-visualizer to generate an embed",
        EVAL_COMMAND_DESCRIPTION: "run epic gamer code",
        EVAL_TOO_LONG: (haste?: string) =>
          haste
            ? `Output was too long, uploaded to hastebin; ${haste}`
            : "Output was too long, failed to upload to hastebin",
        EXPLICIT_CONTENT_FILTER_DISABLED: "No Filter",
        EXPLICIT_CONTENT_FILTER_MEMBERS_WITHOUT_ROLES: "Members Without Roles",
        EXPLICIT_CONTENT_FILTER_ALL_MEMBERS: "All Members",
        FILTEREXCL_COMMAND_DESCRIPTION:
          "Exclude a member/role/channel from link filtering",
        FILTEREXCL_LIST_SOME_REMOVED: (mentions: string[], removed: string[]) =>
          mentions.length
            ? `Currently excluded from filtering ${
                mentions.length > 1 ? "are" : "is"
              }:\n${mentions.join(
                ", "
              )}\n\nI have also removed some items from the exclusion list due to not being found (member left, role/channel deleted):\n${removed.join(
                ", "
              )}`
            : `I have reset the filter exclusion list due to some items from the exclusion list (${removed.join(
                ", "
              )}) not being found (member left, role/channel deleted)`,
        FILTEREXCL_SET_SOME_REMOVED: (mentions: string[], removed: string[]) =>
          mentions.length
            ? `Successfully set filter exclusion list to:\n${mentions.join(
                ", "
              )}\n\nI have also removed some items from the exclusion list due to not being found (member left, role/channel deleted):\n${removed.join(
                ", "
              )}`
            : `I have reset the filter exclusion list due to the remaining items on the exclusion list (${removed.join(
                ", "
              )}) not being found (member left, role/channel deleted)`,
        FILTEREXCL_LIST: (mentions: string[], removed: string[]) =>
          mentions.length
            ? `Currently excluded from filtering ${
                mentions.length > 1 ? "are" : "is"
              }:\n${mentions.join(", ")}`
            : "No members, roles or channels are excluded from the filter. Only moderators will bypass link filtering",
        FILTEREXCL_SET: (mentions: string[], removed: string[]) =>
          mentions.length
            ? `Successfully set filter exclusion list to:\n${mentions.join(
                ", "
              )}`
            : "Successfully reset filter exclusion list.",
        FILTER_INVITE_LOG_DESCRIPTION: (channel: string) =>
          `**Invite link sent in** ${channel}`,
        FILTER_INVITE_LOG_CODE: "Invite Code",
        FILTER_INVITE_LOG_LINK: "Invite Link",
        FILTER_PAYPAL_LOG_DESCRIPTION: (channel: string) =>
          `**PayPal link sent in** ${channel}`,
        FILTER_YOUTUBE_LOG_DESCRIPTION: (channel: string) =>
          `**YouTube link sent in** ${channel}`,
        FILTER_YOUTUBE_VIDEO_LOG_STATS: (
          views: string,
          likes: string,
          dislikes: string,
          comments: string
        ) =>
          `${views} views, ${likes} likes, ${dislikes} dislikes, ${comments} comments`,
        FILTER_YOUTUBE_CHANNEL_LOG_STATS: (
          subs: string,
          views: string,
          videos: string
        ) => `${subs} subscribers, ${views} total views, ${videos} videos`,
        FILTER_TWITCH_CLIP_LOG_DESCRIPTION: (channel: string) =>
          `**Twitch clip sent in** ${channel}`,
        FILTER_TWITCH_CHANNEL_LOG_DESCRIPTION: (channel: string) =>
          `**Twitch channel sent in** ${channel}`,
        FILTER_TWITTER_LOG_DESCRIPTION: (channel: string) =>
          `**Twitter link sent in** ${channel}`,
        FILTER_SHORT_LOG_DESCRIPTION: (channel: string) =>
          `**Shortened link sent in** ${channel}`,
        GUILD_COMMAND_DESCRIPTION: "Get a general overview of the guild",
        GUILD_CREATED_AT: (owner: string, created: string) =>
          owner
            ? `**Created by ${owner} ${created}**`
            : `**Created:** ${created}`,
        GOOGLE_COMMAND_DESCRIPTION: "Speak to the Google Assistant",
        GOOGLE_TOO_LONG:
          "<a:okaygoogle:769207087674032129> Your query is too long!",
        GUILDUPDATELOG_AUTHOR: (name: string) => `Guild Update | ${name}`,
        GUILDUPDATELOG_ICON_CHANGED: "Icon Changed",
        GUILDUPDATELOG_SPLASH_CHANGED: "Invite Splash Changed",
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
        HELP_NO_COMMAND:
          "You must provide a valid command for info or no command for a full list",
        HELP_CREDITS_NAME: "Credits",
        HELP_CREDITS_VALUE: `
Fire uses libraries/services made by [Ravy](https://ravy.pink/) & [The Aero Team](https://aero.bot/) including
[@aero/sanitizer](https://www.npmjs.com/package/@aero/sanitizer)
[@aero/ksoft](https://www.npmjs.com/package/@aero/ksoft)
[Aether](https://git.farfrom.earth/aero/aether)
`,
        HELP_LINKS_NAME: "Useful Links",
        HELP_LINKS_VALUE: `[Website](${constants.url.website}) - [Support](${constants.url.support}) - [Terms of Service](${constants.url.terms}) - [Privacy Policy](${constants.url.privacy}) - [Status](${constants.url.fireStatus}) - [Premium](${constants.url.premium})`,
        HELP_FOOTER: (prefix: string, cluster: number) =>
          `Use "${prefix}help <command>" for more info about the command | Cluster ID: ${cluster}`,
        ICON_COMMAND_DESCRIPTION: "Get the server's icon",
        ICON_TITLE: (guild: string) => `${guild}'s icon`,
        INVCREATE_LOG_AUTHOR: (guild: string) => `Invite Create | ${guild}`,
        INVDELETE_LOG_AUTHOR: (guild: string) => `Invite Delete | ${guild}`,
        INVITE_ROLE_REASON: (invite: string) =>
          `Invite role for invite ${invite}`,
        INVITEROLE_COMMAND_DESCRIPTION:
          "Automatically add a role to a user when they join with a specific invite",
        INVITEROLE_GUILD_INVITE_REQUIRED:
          "You must provide a valid invite and it must be for this guild",
        INVITEROLE_ROLE_INVALID:
          "I am unable to give users this role. It must be lower than my top role & your top role, not managed & not the everyone role",
        INVITEROLE_ROLE_REQUIRED:
          "You must provide either an existing invite to delete an existing invite role or an invite & role to add an invite role",
        INVITEROLE_LOG_AUTHOR: "Invite Roles",
        INVITEROLE_DELETE_SUCCESS: (invite: string, role?: string) =>
          `Successfully deleted invite role for discord.gg\\/${invite}${
            role ? " & " + role : ""
          }`,
        INVITEROLE_DELETE_FAILED: (invite: string, role?: string) =>
          `Failed to delete invite role for discord.gg\\/${invite}${
            role ? " & " + role : ""
          }`,
        INVITEROLE_CREATE_SUCCESS: (
          invite: string,
          role?: string,
          created: boolean = true
        ) =>
          `Successfully ${
            created ? "created" : "updated"
          } invite role for discord.gg\\/${invite}${role ? " & " + role : ""}`,
        INVITEROLE_CREATE_FAILED: (invite: string, role?: string) =>
          `Failed to create invite role for discord.gg\\/${invite}${
            role ? " & " + role : ""
          }`,
        JOINED_WITHOUT_INVITE:
          "Joined without an invite (Preview Mode/Server Discovery)",
        JOINMSG_COMMAND_DESCRIPTION:
          "Set the join message and a channel to send it in",
        JOINMSG_ARGUMENT_INVALID:
          'You must provide either a channel or "disable"',
        JOINMSG_MESSAGE_REQUIRED:
          "You must provide a message for me to send on join. Run the command without arguments to see the variables you can uses",
        JOINMSG_SETUP_REQUIRED: `${constants.emojis.error} Please provide a channel and message for join messages.`,
        JOINMSG_CURRENT_SETTINGS: (prefix: string) =>
          `**Current Join Message Settings**\nDo __${prefix}joinmsg disable__ to disable join messages`,
        JOINMSG_DISABLE_ALREADY: "Join messages are already disabled",
        JOINMSG_SET_SUCCESS: (channel: string) =>
          // this will be used in a string with the example since I cannot set allowed mentions with Message#success
          `Join messages will show in ${channel}!\nExample:`,
        KICK_LOG_AUTHOR: (user: string) => `Kick | ${user}`,
        KICK_SUCCESS: (user: string) =>
          `${constants.emojis.success} **${user}** has been kicked.`,
        KICK_FAILED_ENTRY:
          "Failed to create mod log entry, user was not kicked.",
        KICK_FAILED_KICK: "Failed to kick user, please try again.",
        KICK_FAILED_KICK_AND_ENTRY:
          "Failed to kick user and was unable to delete the created mod log entry.",
        KICK_COMMAND_DESCRIPTION: "Kick a user from the server",
        KICK_USER_REQUIRED: "You must provide a user to kick!",
        SK1ER_NO_REUPLOAD: (user: string) =>
          `${user} I am unable to read your log to remove sensitive information & provide solutions to your issue. Please upload the log directly :)`,
        SK1ER_REUPLOAD_FETCH_FAIL: (domain: string) =>
          `I was unable to read your log. Please upload it directly rather than using ${domain}`,
        MC_LOG_READ_FAIL:
          "I was unable to read the attachment, try reupload it. If it still doesn't work, yell at Geek :)",
        SK1ER_MODCORE_ZIP: (user: string, zip: string) =>
          `${user}, Download the zip from ${zip} and then unzip it in \`.minecraft/modcore\` and your issue should be resolved.`,
        MC_LOG_HASTE: (
          user: string,
          diff: string,
          msgType: string,
          extra: string,
          haste: string,
          solutions: string
        ) =>
          `${user} ${msgType} a log${
            diff ? " from " + diff : ""
          }, ${extra}\n${haste}\n\n${solutions}`,
        SK1ER_NITRO_PERKS_REMOVED: (member: string) =>
          `${member}, Your nitro perks have been removed. Boost the server to get them back :)`,
        SK1ER_NITRO_PERKS_REMOVED_LEFT: (member: string) =>
          `${member} left and their nitro perks have been removed.`,
        SK1ER_BETA_SUCCESS: (member: string) =>
          `${member}, you now have access to betas!
Download beta versions in <#595634170336641045> (check the pins for the latest versions) and ask questions/report bugs with **betas only** in <#595625113282412564>`,
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
        LANGUAGE_COMMAND_HELLO: (type: "guild" | "user") =>
          type == "user"
            ? "Hello! You have successfully set Fire's language to English (US) :D"
            : "Hello! You have successfully set Fire's language in this guild to English (US). Want to set it just for you? Run the command in DMs",
        LEAVEMSG_COMMAND_DESCRIPTION:
          "Set the leave message and a channel to send it in",
        LEAVEMSG_ARGUMENT_INVALID:
          'You must provide either a channel or "disable"',
        LEAVEMSG_MESSAGE_REQUIRED:
          "You must provide a message for me to send on leave. Run the command without arguments to see the variables you can uses",
        LEAVEMSG_SETUP_REQUIRED: `${constants.emojis.error} Please provide a channel and message for leave messages.`,
        LEAVEMSG_CURRENT_SETTINGS: (prefix: string) =>
          `**Current Leave Message Settings**\nDo __${prefix}leavemsg disable__ to disable leave messages`,
        LEAVEMSG_DISABLE_ALREADY: "Leave messages are already disabled",
        LEAVEMSG_SET_SUCCESS: (channel: string) =>
          // this will be used in a string with the example since I cannot set allowed mentions with Message#success
          `Leave messages will show in ${channel}!\nExample:`,
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
        LINKFILTER_COMMAND_DESCRIPTION:
          "Enable different link filters. Run the command without arguments to see all available filters",
        LINKFILTER_FILTER_LIST: (valid: string[]) =>
          `You must choose a valid filter to toggle. The available filters are:\n${valid.join(
            ", "
          )}`,
        LINKFILTER_SET: (enabled: string[]) =>
          `Successfully set link filters. Currently enabled filters are:\n${enabled.join(
            ", "
          )}`,
        LINKFILTER_RESET: (enabled: string[]) =>
          "Successfully disabled all filters.",
        LOCKDOWN_COMMAND_DESCRIPTION:
          "Lock all channels in the server, useful for stopping raids",
        LOCKDOWN_ACTION_REQUIRED:
          "You must provide an action! Possible actions are `start`, `end` or `exclude`",
        LOCKDOWN_EXCLUDE_REQUIRED:
          "You must exclude at least one category from server lockdown before you can start/end lockdown",
        LOCKDOWN_REASON: (user: string, reason: string) =>
          `Server lockdown started by ${user} with reason "${reason}".`,
        LOCKDOWN_END_NONE_LOCKED:
          "It seems there's no locked channels so you can't end lockdown as it was never started",
        LOCKDOWN_END_REASON: (user: string, reason: string) =>
          `Server lockdown ended by ${user} with reason "${reason}".`,
        LOGGING_COMMAND_DESCRIPTION: "Set the channel(s) for logging",
        LOGGING_INVALID_TYPE: (types: string) =>
          `That is not a valid log type! Current types are ${types}`,
        LOGGING_SIZE_SAME_CHANNEL:
          "Due to this servers size, you cannot set multiple log types in the same channel",
        LOGGING_DISABLED_MODERATION: "Moderation logs have been disabled.",
        LOGGING_DISABLED_ACTION: "Action logs have been disabled.",
        LOGGING_DISABLED_MEMBERS: "Member logs have been disabled.",
        LOGGING_MODERATION_DISABLED_MEMBERCOUNT:
          "Moderation logs have been disabled due to this servers size. You can re-enable them with the `log` command but you must choose separate channels for each log type",
        LOGGING_ACTION_DISABLED_MEMBERCOUNT:
          "Action logs have been disabled due to this servers size. You can re-enable them with the `log` command but you must choose separate channels for each log type",
        LOGGING_MEMBERS_DISABLED_MEMBERCOUNT:
          "Member logs have been disabled due to this servers size. You can re-enable them with the `log` command but you must choose separate channels for each log type",
        LOGGING_ENABLED_MODERATION:
          "Moderation logs have been enabled! Moderation actions such as warnings, mutes, kicks, bans etc. will be logged in your chosen channel.",
        LOGGING_ENABLED_ACTION:
          "Action logs have been enabled! Actions such as message edits/deletes, filtered messages, channel creates/deletes etc. will be logged in your chosen channel.",
        LOGGING_ENABLED_MEMBERS:
          "Member logs have been enabled! Actions such as member joins & leaves will be logged in your chosen channel.",
        LOGIGNORE_COMMAND_DESCRIPTION: "Ignore specific channels from logs",
        LOGIGNORE_LIST_CURRENT: (channels: string[]) =>
          channels.length
            ? `Currently ignored channels are

${channels.join(", ")}`
            : "No channels are currently ignored from logging",
        LYRICS_COMMAND_DESCRIPTION:
          'Get the lyrics for a song. (For best results, use the format "artist_name song_title")',
        LYRICS_NO_QUERY:
          'You need to provide a song to get the lyrics for. For best results, use the format "artist_name song_title"',
        LYRICS_NOT_FOUND: (error?: any) =>
          error && error == "Error: No results"
            ? "I couldn't find any lyrics for that song"
            : "An error occurred while trying to fetch lyrics.",
        LYRICS_TITLE: (title: string, artist: string) =>
          `${title} by ${artist}`,
        MAKEAMEME_COMMAND_DESCRIPTION:
          'Make your own meme using the "top text bottom text" format',
        MAKEAMEME_NO_IMAGE:
          "You need to provide an image url or attach an image to make a meme",
        MAKEAMEME_NO_TEXT: "You must provide text separated by **|**",
        MAKEAMEME_UPLOAD_FAIL: "Failed to upload spicy meme :(",
        MEMBERJOIN_LOG_AUTHOR: (member: string) => `Member Join | ${member}`,
        MEMBERJOIN_LOG_PREMIUM_UPSELL_TITLE:
          "Want to see what invite they used?",
        MEMBERJOIN_LOG_PREMIUM_UPSELL_VALUE:
          "Fire Premium allows you to do that and more.\n[Learn More](https://gaminggeek.dev/premium)",
        MEMBERLEAVE_LOG_AUTHOR: (member: string) => `Member Leave | ${member}`,
        MEME_COMMAND_DESCRIPTION: "Get a random meme",
        MEME_NOT_FOUND: (error?: any) =>
          error && error == "Error: subreddit not found"
            ? "I couldn't find any memes. Here's an idea! Try a subreddit that actually exists next time ;)"
            : "An error occurred while trying to fetch some spicy memes.",
        MEME_NSFW_FORBIDDEN:
          "The meme I was given was marked as NSFW but this channel is not. If you're looking for NSFW memes, head to an NSFW channel, otherwise just try again",
        MEME_EMBED_TITLE: "Did someone order a spicy meme?",
        MEME_EMBED_AUTHOR: (user: string) => `Requested by ${user}`,
        MEME_SUBREDDIT: "Subreddit",
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
        MODERATOR_ACTION_DISALLOWED:
          "You are not allowed to perform this action on this user!",
        MODERATOR_ACTION_DEFAULT_REASON: "No reason provided.",
        MODLOGS_COMMAND_DESCRIPTION: "	View moderation logs for a user",
        MODLOGS_NONE_FOUND:
          "No moderation logs found for that user, their record is squeaky clean!",
        MODLOGS_CASE_ID: "Case ID",
        MODLOGS_MODERATOR_ID: "Moderator ID",
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
        MCUUID_COMMAND_DESCRIPTION: "Get a player's Minecraft UUID",
        MCUUID_INVALID_IGN: "You must provide a valid IGN to get the UUID of",
        MCUUID_FETCH_FAIL:
          "Failed to fetch the UUID, make sure the IGN is a valid player",
        MCUUID_UUID: (ign: string, uuid: string) =>
          `${ign} has the UUID ${uuid}`,
        MOD_COMMAND_DESCRIPTION: "Get information about a Sk1er LLC mod",
        MOD_FETCH_FAIL: "Failed to fetch mod data",
        MOD_INVALID: "You must provide a valid mod",
        MOD_LIST: "All Mods",
        MODCORE_COMMAND_DESCRIPTION: "Get a player's modcore profile",
        MODCORE_INVALID_IGN:
          "You must provide a valid IGN to get the ModCore profile of",
        MODCORE_PROFILE_FETCH_FAIL: "Failed to fetch that player's profile",
        MODCORE_PROFILE_TITLE: (player: string) =>
          `${player}'s ModCore Profile`,
        MODCORE_ENABLED_COSMETICS: "Enabled Cosmetics",
        MODCORE_NO_COSMETICS: "No Cosmetics",
        MSGEDITLOG_DESCRIPTION: (author: string, channel: string) =>
          `**${author} edited a message in ${channel}**`,
        MSGDELETELOG_DESCRIPTION: (author: string, channel: string) =>
          `**${author}'s message in ${channel} was deleted**`,
        MSGDELETELOG_ATTACH_WARN:
          "__Attachment URLs are invalidated once the message is deleted.__",
        MSGDELETELOG_SPOTIFY_ACTIVITY: "Spotify Invite",
        MSGDELETELOG_ACTIVITY: (partyID: string, type: number) =>
          `Party ID: ${partyID}\nType: ${this.get("ACTIVITY_TYPES")[type]}`,
        MUTEROLE_COMMAND_DESCRIPTION: "Change the role used to mute members",
        MUTE_ROLE_CREATE_REASON: "Setting up muted role...",
        MUTE_LOG_AUTHOR: (user: string) => `Mute | ${user}`,
        MUTE_SUCCESS: (user: string) =>
          `${constants.emojis.success} **${user}** has been muted.`,
        MUTE_SEMI_SUCCESS: (user: string) =>
          `${constants.emojis.warning} **${user}** has been muted but I was unable to save it in my database. The mute may not persist but if it's not too long, it should be fine or you can try again`,
        MUTE_FAILED_ROLE:
          "Failed to create muted role, please ensure I have the correct permissions",
        MUTE_FAILED_ENTRY:
          "Failed to create mod log entry, user was not muted.",
        MUTE_FAILED_MUTE: "Failed to mute user, please try again.",
        MUTE_FAILED_MUTE_AND_ENTRY:
          "Failed to mute user and was unable to delete the created mod log entry.",
        MUTE_COMMAND_DESCRIPTION:
          "Mute a user either until manually unmuted or for a time (e.g. 1 hour)",
        MUTE_USER_REQUIRED: "You must provide a user to mute!",
        MUTE_FAILED_PARSE_TIME:
          "I was unable to parse the time in your message",
        MUTE_TIME_TOO_SHORT: "That time is too short!",
        NICKCHANGELOG_OLD_NICK: "Old Nickname",
        NICKCHANGELOG_NEW_NICK: "New Nickname",
        NITROPERKS_COMMAND_DESCRIPTION:
          "Claim nitro perks for a Minecraft account (locked to discord.gg/sk1er)",
        NITROPERKS_INVALID_IGN:
          "You must provide a valid IGN to claim nitro perks.",
        NITROPERKS_MODULE_ERROR:
          "I can't give nitro perks as the Sk1er module hasn't been loaded, <@287698408855044097> probably broke something...",
        NITROPERKS_FAILED:
          "Failed to give nitro perks! Make sure your IGN is valid and you've purchased the game.\nThere may also be an issue with the Mojang API or Sk1er's API causing this issue",
        OSS_COMMAND_DESCRIPTION: "Sends my GitHub repo link",
        OSS_MESSAGE:
          "You can find Fire's source code at <https://github.com/FireDiscordBot/bot>",
        PING_COMMAND_DESCRIPTION: "Shows you my ping to discord's servers",
        PING_INITIAL_MESSAGE: "Pinging...",
        PING_FOOTER: (shard: number, cluster: number) =>
          `Shard ID: ${shard} | Cluster ID: ${cluster}`,
        PING_FINAL_MESSAGE: "Pong!",
        PINSADDLOG_AUTHOR: (channel: string) => `Message Pinned | ${channel}`,
        PUBLIC_COMMAND_DESCRIPTION:
          "Set your server to public allowing it to be visible on Fire's Public Servers page",
        PUBLIC_VANITY_BLACKLIST:
          "This guild has been blacklisted from vanity features and therefore cannot be public!",
        PUBLIC_VANITY_REQUIRED: (prefix: string) =>
          `You must set a vanity url with \`${prefix}vanityurl\` before your guild can be public`,
        PUBLIC_ENABLED: (vanity: string) =>
          `Your guild is now public & visible on <https://inv.wtf/discover>.
People will be able to use your guild's vanity url (<https://inv.wtf/${vanity}>) to join`,
        PUBLIC_ENABLED_LOG: (user: string) =>
          `${constants.statuspage.emojis.operational} Ths server was set to public by ${user} and will appear on Fire\'s public server list`,
        PUBLIC_DISABLED:
          "Your guild is no longer public and will no longer show on the Fire website",
        PUBLIC_DISABLED_LOG: (user: string) =>
          `${constants.statuspage.emojis.major_outage} Ths server was manually removed from Fire\'s public server list by ${user}`,
        PLONK_COMMAND_DESCRIPTION:
          "Make a user unable to use the best discord bot in your server",
        PLONK_FORBIDDEN: () =>
          `You must be in a server and have the **${
            this.get("PERMISSIONS")["MANAGE_GUILD"]
          }** permission to use this.`,
        PLONK_USER_REQUIRED: "You must provide a user to plonk",
        PLONK_LOG_AUTHOR: (user: string) => `Blacklist | ${user}`,
        PLONK_SUCCESS: (user: string, guild: string, plonked: boolean) =>
          plonked
            ? `${constants.emojis.success} **${user}** is no longer able to run commands in ${guild}.`
            : `${constants.emojis.success} **${user}** is now able to run commands in ${guild}.`,
        PLAYWRIGHT_ERROR_NOT_READY:
          "Aether has not loaded fully yet, please try again in a moment.",
        PLAYWRIGHT_ERROR_BAD_REQUEST: "The request to Aether was malformed.",
        PLAYWRIGHT_ERROR_UNKNOWN: "Something went wrong. Try again later",
        PREFIX_COMMAND_DESCRIPTION:
          "Set the prefix used to trigger Fire's command",
        PREFIX_MISSING_ARG: "You must provide a new prefix",
        PREFIX_GLOBAL: `"fire " is a global prefix and can be used anywhere. There's no need to set it as a server prefix`,
        PREFIX_ALREADY_SET: "That's already set as this server's prefix",
        PREFIX_SET: (old: string, newp: string) =>
          `This server's prefix has been set from "${old}" to "${newp}"`,
        PURGE_COMMAND_DESCRIPTION:
          "Bulk delete messages with optional flags to selectively delete messages based on certain factors",
        PURGE_AMOUNT_INVALID: "Invalid amount. Minumum is 2, Maximum is 100",
        PURGE_HISTORY_FAIL: "Failed to fetch messages",
        PURGE_SUCCESS: (messages: number) =>
          `Successfully deleted **${messages}** messages!`,
        PURGE_FAIL: "Failed to purge messages...",
        PURGE_LOG_DESCRIPTION: (amount: number, channel: string) =>
          `**${amount} messages were purged in ${channel}**`,
        PURGE_LOG_FOOTER: (user: string, channel: string) =>
          `Author ID: ${user} | Channel ID: ${channel}`,
        PURGED_MESSAGES: "Purged Messages",
        PURGED_MESSAGES_FAILED: "Failed to upload messages to hastebin",
        QUOTE_COMMAND_DESCRIPTION: "Quote a message from an ID or URL",
        AUTOQUOTE_COMMAND_DESCRIPTION:
          "Enable automatic quoting when a message URL is sent",
        AUTOQUOTE_ENABLED:
          "Successfully enabled auto quoting. Message links found in a message will be quoted",
        AUTOQUOTE_DISABLED:
          "Successfully disabled auto quoting. Message links found in a message will no longer be quoted",
        QUOTE_WEBHOOK_CREATE_REASON:
          "This webhook will be used for quoting messages in this channel",
        QUOTE_EMBED_FROM: (author: string, channel: string) =>
          `Raw embed from ${author} in #${channel}`,
        QUOTE_EMBED_FOOTER_ALL: (
          user: string,
          channel: string,
          guild: string
        ) => `Quoted by: ${user} | #${channel} | ${guild}`,
        QUOTE_EMBED_FOOTER_SOME: (user: string, channel: string) =>
          `Quoted by: ${user} | #${channel}`,
        QUOTE_EMBED_FOOTER: (user: string) => `Quoted by: ${user}`,
        RANK_COMMAND_DESCRIPTION:
          "List all available ranks and join a rank if provided",
        RANKS_NONE_FOUND: "Seems like there's no ranks set for this guild",
        RANKS_INFO: (role: string, members: string) =>
          `> ${role} (${members} members)`,
        RANKS_AUTHOR: (guild: string) => `${guild}'s ranks`,
        RANKS_JOIN_REASON: "Joined rank",
        RANKS_JOIN_RANK: (role: string) =>
          `You successfully joined the **${role}** rank.`,
        RANKS_LEAVE_REASON: "Left rank",
        RANKS_LEFT_RANK: (role: string) =>
          `You successfully left the **${role}** rank.`,
        RANKS_INVALID_ROLE:
          "That isn't a valid rank. Use the command without arguments to see a list of valid ranks",
        RANKS_INVALID_ROLE_DEL:
          "That isn't a valid rank. Use the rank command to see a list of valid ranks",
        RANKS_SK1ER_NO_SPECS: (
          mention: string
        ) => `${mention} To become a beta tester, please provide your specs through this form: 
<https://inv.wtf/sk1spec>`,
        ADDRANK_COMMAND_DESCRIPTION:
          "Add a role that users can join through the rank command.",
        RANKS_ALREADY_ADDED: "You can't add a rank twice silly",
        DELRANK_COMMAND_DESCRIPTION:
          "Remove a rank from the list of joinable roles.",
        REACTIONROLE_ROLE_REASON: "Adding reaction role",
        REACTIONROLE_ROLE_REMOVE_REASON: "Removing reaction role",
        REACTIONROLE_COMMAND_DESCRIPTION:
          "Setup roles users will receive when reacting to a message with a specific emoji",
        REACTIONROLE_INITIAL: (role: string) =>
          `You have 60 seconds to react to your desired message with the emoji you'd like users to react with to receive ${role}...

If you've already setup a reaction role for this role and want to remove it, just react to the existing one to delete it!`,
        REACTIONROLE_REJECTED:
          "Seems you either didn't react in time or something went wrong internally...",
        REACTIONROLE_MESSAGE_PARTIAL:
          "I was unable to fetch data about that message and was unable to add a reaction role to it",
        REACTIONROLE_DELETED: (
          author: string,
          channel: string,
          jump: string,
          emoji: string,
          role: string
        ) => `Alright, I've deleted an existing reaction role with the following configuration,
          
Message: Sent by ${author} in ${channel} (<${jump}>)
Emoji: ${emoji}
Role: ${role}

If you didn't want to delete it, just set it up again, it won't take long!`,
        REACTIONROLE_CONFIRMATION: (
          author: string,
          channel: string,
          jump: string,
          emoji: string,
          role: string
        ) => `Alright, here's what I've got,
          
Message: Sent by ${author} in ${channel} (<${jump}>)
Emoji: ${emoji}
Role: ${role}

If this is correct, react with ${constants.emojis.success} to confirm it.
Otherwise, react with ${constants.emojis.error} to cancel.
(wait for both emojis to appear before reacting)`,
        REACTIONROLE_CANCELLED: "Okay, cancelled.",
        REACTIONROLE_COMPLETE: "Great, everything should be good to go!",
        REACTIONROLE_OOPSIE:
          "Seems like the database did an oopsie while trying to save your reaction role. Try doing the exact same thing again and hope for different results.",
        REACTIONROLE_LOG_AUTHOR: (guild: string) => `Reaction Role | ${guild}`,
        REDIRECT_SHORT_URL: "Short URL",
        REDIRECT_COMMAND_DESCRIPTION:
          "Create a redirect to any website using inv.wtf, e.g. inv.wtf/bot.",
        REDIRECT_ARGS_REQUIRED:
          "You must provide a code and url to create a redirect",
        REDIRECT_LIST_AUTHOR: "Your redirects",
        REDIRECT_LIST_DESCRIPTION: (
          codes: string[],
          remaining: number,
          prefix: string
        ) =>
          `${codes.join(", ")}

You can create ${remaining} more redirects! (Each premium server you have gives 5 redirects)
Use \`${prefix}redirect <code>\` to view information about a redirect`,
        REDIRECT_NOT_FOUND: "You don't seem to have a redirect with that code.",
        REDIRECT_URL_INVALID:
          "That URL is invalid! It must be https and not a Discord invite/inv.wtf URL",
        REDIRECT_REGEX_FAIL:
          "Redirects can only contain characters A-Z0-9 and be between 2 and 15 characters",
        REDIRECT_ERROR_PREMIUM:
          "You must have an active premium subscription to create redirects!",
        REDIRECT_CREATED: (code: string, url: string, dev: boolean) =>
          `Redirect created! <https://${
            dev ? "test." : ""
          }inv.wtf/${code}> will now lead to <${url}>`,
        REDIRECT_ERROR_LIMIT:
          "You've hit the limit! You must delete a redirect to create another",
        REDIRECT_ERROR_EXISTS:
          "A Vanity URL or Redirect already exists with that code!",
        REMINDER_TIME_UNKNOWN: "an unknown time", // used for time below, e.g. an unknown time ago
        REMINDER_MESSAGE: (text: string, time: string, link?: string) =>
          link
            ? `You asked me ${time} ago to remind you about "${text}"\n${link}`
            : `You asked me ${time} ago to remind you about "${text}"`,
        REMIND_COMMAND_DESCRIPTION:
          "Ask me to remind you something and I'll remind you, provided Discord isn't dying",
        REMIND_ARG_DESCRIPTION:
          'Your reminder, including the time in the format "X mins X days" etc.',
        REMINDER_MISSING_ARG:
          "I can't remind you about nothing, you need to provide the reminder text and duration",
        REMINDER_INVALID_REPEAT:
          "The repeat flag value is invalid, it must range from 1 to 5",
        REMINDER_SEPARATE_FLAGS:
          "The step and repeat flags must be used together, they cannot be used individually",
        REMINDER_INVALID_STEP:
          'The step flag value is invalid. Use this flag to set multiple reminders with a predefined "step" after each',
        REMINDER_MISSING_TIME:
          'You need to include a duration for your reminder, e.g. "69 mins" for 69 minutes',
        REMINDER_MISSING_CONTENT: "I need something to remind you about...",
        REMINDER_TIME_LIMIT:
          "Reminders are currently limited to 3 months (90 days). This may increase in the future",
        REMINDER_TOO_SHORT:
          "If you need a bot to remind you about something in less than two minutes, there's an issue that you should probably look into...",
        REMINDER_STEP_TOO_SHORT:
          "The step flag value must be 2 minutes or more",
        REMINDER_CREATED: (success: string[], failed: string[]) =>
          success.length == 1
            ? `Got it! I'll remind you in ${success[0]}`
            : `Got it! I've set reminders for the following times,
${success.map((s) => "- " + s).join("\n")}${
                failed.length
                  ? "\n\nI unfortunately failed to set reminders for the following times,\n" +
                    failed.map((f) => "- " + f).join("\n")
                  : ""
              }`,
        REMINDERS_COMMAND_DESCRIPTION: "List all reminders you have set",
        REMINDERS_NONE_FOUND:
          "You must have a good memory because I found no reminders",
        DELREMIND_COMMAND_DESCRIPTION:
          "Delete a reminder using the index from the reminders command",
        DELREMIND_ARG_DESCRIPTION:
          "The reminder you want to delete. Use the [number] from the reminders command",
        DELREMIND_MISSING_ARG: "You need to provide a reminder to delete",
        DELREMIND_TOO_HIGH: "You don't have that many reminders",
        DELREMIND_CONFIRM: (reminder: { date: Date; text: string }) =>
          `Reminder for ${reminder.date.toLocaleString(this.id)}, ${
            reminder.text
          }\n\nAre you sure you want to delete this reminder? Say "yes" to delete.`,
        DELREMIND_NO: "Ok, I won't delete it",
        DELREMIND_TIME:
          "You didn't respond quick enough. The reminder has not been deleted",
        DELREMIND_YES:
          "It is gone! Remember, when using this command again, the indexes will have changed so make sure you're using the right one",
        ROLEADDLOG_FIELD_TITLE: "Added Roles",
        ROLEREMOVELOG_FIELD_TITLE: "Removed Roles",
        ROLEPERSIST_REASON: "Adding persisted roles",
        ROLEPERSIST_COMMAND_DESCRIPTION:
          "Add a role(s) that will stay with the user, even if they leave and rejoin.",
        ROLEPERSIST_ROLE_INVALID:
          "I am unable to persist this role. It must be lower than my top role & your top role, not managed & not the everyone role",
        ROLEPERSIST_SELF: "You cannot persist roles to yourself!",
        ROLEPERSIST_GOD:
          "You cannot persist roles to someone higher than yourself (and I don't mean high on drugs smh)",
        ROLEPERSIST_MODLOG_REASON: (roles: string[]) =>
          roles.length
            ? `Persisted roles ${roles.join(", ")}`
            : "Removed all persisted roles.",
        ROLEPERSIST_LOG_AUTHOR: (member: string) => `Role Persist | ${member}`,
        ROLEPERSIST_SUCCESS: (member: string, roles: string[]) =>
          roles.length
            ? `Success! ${member} now has the role${
                roles.length > 1 ? "s" : ""
              } ${roles.join(", ")} persisted to them. Remove ${
                roles.length > 1 ? "a" : "the"
              } role to unpersist it`
            : // below should be impossible to get since you remove persisted
              // roles by removing the role from the user but just in case
              `${member} no longer has any roles persisted to them.`,
        ROLEPERSIST_FAILED: "I was unable to persist that role to that user",
        SKIN_COMMAND_DESCRIPTION: "See a player's Minecraft skin",
        SKIN_INVALID_IGN: "You must provide a valid IGN to get the skin of",
        SLOWMODE_COMMAND_DESCRIPTION:
          "Set the slowmode for a channel or category. Use the slowmodeall alias to set it for all channels",
        SLOWMODE_INVALID_TYPE: "You must provide a text channel or category",
        SLOWMODE_FAILED: (channels: string[]) =>
          `Failed to set slowmode in ${channels.join(", ")}`,
        SLOWMODE_SETTING_GLOBAL: (channels: number) =>
          `Attempting to set slowmode in ${channels} channels, this may take a while`,
        SLOWMODE_GLOBAL_FAIL_SOME: (failed: string[]) =>
          `I set slowmode in some channels but failed to set slowmode in ${failed.join(
            ", "
          )}`,
        SPECS_COMMAND_DESCRIPTION:
          "View/remove a users specs (locked to discord.gg/sk1er)",
        SPECS_NOT_FOUND:
          "Specs not found for that user. Tell them to fill in this form\n<https://inv.wtf/sk1spec>",
        STATS_COMMAND_DESCRIPTION: "View cluster & overall stats.",
        STATS_TITLE: (name: string, version: string) =>
          `Stats for ${name} [${version}]`,
        STATS_MEMORY_USAGE: "Memory Usage",
        STATS_DJS_VER: "Discord.JS Version",
        STATS_NODE_VER: "Node.JS Version",
        STATS_UPTIME: "Uptime",
        STATS_COMMANDS: "Commands",
        STATS_EVENTS: "Events",
        STATS_FOOTER: (manager: number, shard: number) =>
          `PID: ${process.pid} | Cluster: ${manager} | Shard: ${shard}`,
        STEAL_COMMAND_DESCRIPTION: "Steal an emote to use in your own server",
        STEAL_NOTHING:
          "You're a terrible criminal, you can't steal nothing! You must provide an emoji to steal",
        STEAL_INVALID_EMOJI:
          "If you're going to try and steal an emoji, at least make it a valid one...\nOtherwise it's a waste of time and you'll likely get caught ¯\\\\_(ツ)\\_/¯",
        STEAL_CAUGHT:
          "Seems like you were caught red handed while trying to steal that emoji. You have returned the emoji you attempted to steal",
        STEAL_STOLEN: (emoji: string) =>
          `Nice! You stole ${emoji} without getting caught by a nasty error :)`,
        SUGGEST_COMMAND_DESCRIPTION: "Suggest a feature for Fire.",
        SUGGESTION_SUCCESS: (card: any) =>
          `Thanks! Your suggestion was added to the Trello @ <${card.url}>. Make sure to check it every now and then for a response.
Abuse of this command __**will**__ result in being temporarily blacklisted from Fire`,
        SUPPORT_COMMAND_DESCRIPTION: "Get a link to Fire's support server",
        USER_COMMAND_DESCRIPTION: "Get a general overview of a user.",
        // don't change emote
        USER_SNOWFLAKE_DESCRIPTION: `It looks like that isn't a valid user, but it is a valid snowflake! <:snowflak:784510818556706867>

A [Snowflake](https://discord.com/developers/docs/reference#snowflakes) is essentially a unique ID for a resource (message, user, channel, etc) which contains a timestamp.

You can copy the snowflakes from messages in Discord by right clicking on them.
You must have Developer Mode enabled, which is found in User Settings > Appearance`,
        USER_SNOWFLAKE_BELONGS_TO: (type: string, extra: string) =>
          `**Belongs To**: ${type} ${extra ? "(" + extra + ")" : ""}`,
        USER_KSOFT_BANNED: (user: string, reason: string, proof: string) =>
          `Banned on [KSoft.Si](https://bans.ksoft.si/share?user=${user}) for ${reason} - [Proof](${proof})`,
        VOTE_COMMAND_DESCRIPTION:
          'Sends a link to Fire on a random bot list (sends direct vote link if you use the "vote" alias)',
        PREMIUM_COMMAND_DESCRIPTION:
          "Toggle Fire Premium in the current guild (temporary command for beta testers)",
        PREMIUM_NO_SUBSCRIPTION: `Seems you don't have a premium subscription...
          
Note: This command is temporary and will not work for those who have not been given access to the new premium purchase flow!
If you do have access, make sure you have actually purchased premium (if this is not the dev bot, it will require you to *actually* purchase premium with real money)`,
        PREMIUM_LIMIT_ZERO:
          "Seems you haven't purchased premium or you have cancelled your subscription. You may not be able to modify your premium guilds after cancelling your subscription, even if you still have your trial!",
        PREMIUM_LIMIT_REACHED: (
          current: string[]
        ) => `You've reached the server limit for your subscription! You will need to remove premium from a server before adding it to a new one.
        
Your existing premium servers are: ${current.join(", ")}`,
        PREMIUM_MANAGED_OTHER:
          "This guild's premium is managed by another user.",
        PREMIUM_TRIAL_INELIGIBLE:
          "You currently have a premium trial which this guild is ineligible for!",
        PREMIUM_GUILDS_UPDATED: (current: string[]) =>
          `Successfully updated your premium guilds! You now have premium in ${
            current.length
          } servers (${current.join(", ")})`,
        PREMIUM_UPDATE_FAILED: "Failed to update premium servers!",
        GIVEPREMIUM_COMMAND_DESCRIPTION: "i like money",
        GIVEPREMIUM_MISSING_ARGUMENTS:
          "You need to provide a guild id, user id and reason to add a premium guild",
        GIVEPREMIUM_DELETE_FAIL: "Failed to remove premium.",
        GIVEPREMIUM_INSERT_FAIL: "Failed to give premium.",
        GIVEPREMIUM_RELOAD_FAIL: "Failed to reload premium guilds",
        RELOAD_COMMAND_DESCRIPTION: "reload a command/language/listener/module",
        TAG_COMMAND_DESCRIPTION: "See a list of all tags or view a tag",
        TAG_NONE_FOUND:
          "I searched near and far and could not find any tags...",
        TAG_INVALID_TAG: (tag: string) =>
          `There doesn't seem to be a tag called ${tag}. Run the command again with no arguments to see all tags`,
        TAG_RAW_COMMAND_DESCRIPTION: "View the raw content of a tag",
        TAGS_RAW_MISSING_ARG:
          "You need to provide a tag name to get the raw content of",
        TAG_DELETE_COMMAND_DESCRIPTION: "Delete a tag",
        TAGS_DELETE_MISSING_ARG:
          "Well, I can't really delete nothing can I? Provide a tag name to delete",
        TAG_CREATE_COMMAND_DESCRIPTION: "Create a new tag",
        TAGS_CREATE_MISSING_NAME:
          "Your shiny new tag needs a name, give it one!",
        TAGS_CREATE_MISSING_CONTENT:
          "A tag can't be empty, otherwise it has no purpose in life, like me...",
        TAGS_CREATE_COMMAND_NAME:
          "That name is already being used by a subcommand, try a different one",
        TAGS_CREATE_ALREADY_EXISTS:
          "A tag already exists with that name. Be original next time!",
        TAGS_CREATE_LIMIT:
          "You've reached the tag limit! Upgrade to premium for unlimited tags;\n<https://inv.wtf/premium>",
        TAG_EDIT_COMMAND_DESCRIPTION: "Edit the content of a tag",
        TAGS_EDIT_MISSING_NAME:
          "I need to know what tag to edit. Give me the name of an existing tag",
        TAGS_EDIT_MISSING_CONTENT:
          "You need to provide the new content for the tag",
        TAGS_EDIT_LIMIT: "This tag cannot be modified!",
        TAG_ALIAS_COMMAND_DESCRIPTION: "Create an alias for a tag",
        TAGS_ALIAS_MISSING_NAME:
          "I can't make an alias for nothing. You need to provide an existing tag name",
        TAGS_ALIAS_MISSING_ALIAS:
          "You need to provide a new alias for the tag or an existing alias to delete it",
        TAG_LIST: (guild: string) => `${guild}'s tags`,
        TICKET_COMMAND_DESCRIPTION: "Manage ticket configuration in the server",
        TICKET_MAIN_DESCRIPTION:
          "Here are all the ticket configuration commands",
        TICKET_CATEGORY_DESCRIPTION: `Set the category were tickets are made. **Setting this enables tickets**
Running this command without providing a category resets it, therefore disabling tickets`,
        TICKET_LIMIT_DESCRIPTION: "Limit the number of tickets a user can make",
        TICKET_NAME_DESCRIPTION:
          "Set the name for tickets. There are many variables available for use in the name",
        TICKET_DESCRIPTION_DESCRIPTION:
          "Set the description of the ticket opener embed",
        TICKET_ALERT_DESCRIPTION:
          'Set a role that will be "alerted" when a new ticket is opened',
        TICKETS_DISABLED:
          "I have reset the ticket category therefore disabling tickets in this guild",
        TICKETS_ENABLED: (category: string) =>
          `Successfully enabled tickets and set the category to ${category}.`,
        TICKETS_INVALID_LIMIT: "Invalid limit, it must be a number from 1 to 5",
        TICKET_NAME_LENGTH:
          "Name is too long, it must be 50 characters or less",
        TICKET_NAME_SET: (name: string, example: string) =>
          `Successfully set the tickets name to ${name}\nExample: ${example}`,
        TICKET_DESCRIPTION_RESET: "Successfully reset the tickets description",
        TICKET_DESCRIPTION_SET:
          "Successfully set the ticket description, sending example...",
        TICKET_ALERT_RESET: "Successfully reset the ticket alert role",
        TICKET_ALERT_SET: (role: string) =>
          `Successfully set the ticket alert role. I will ping ${role} when a ticket is opened.`,
        TICKET_DESCRIPTION_EXAMPLE_SUBJECT: "This is an example, wow!",
        TICKET_CHANNEL_TOPIC: (author: string, id: string, subject: string) =>
          subject
            ? `Ticket created by ${author} (${id}) with subject "${subject}"`
            : `Ticket created by ${author} (${id})`,
        TICKET_OPENER_TILE: (author: string) => `Ticket opened by ${author}`,
        TICKET_AUTHOR_LEFT: (author: string) =>
          `The ticket author (${author}) seems to have left the server, how sad :(`,
        NEW_COMMAND_DESCRIPTION: "Makes a new ticket",
        NEW_TICKET_CREATING: "Creating your ticket...",
        NEW_TICKET_CREATED: (channel: string) =>
          `Successfully made your ticket, ${channel}`,
        NEW_TICKET_DISABLED: "Tickets are not enabled here",
        NEW_TICKET_LIMIT: "You have too many tickets open!",
        CLOSE_COMMAND_DESCRIPTION:
          "Closes a ticket, uploads the transcript to action logs channel and sends to the ticket author",
        TICKET_WILL_CLOSE:
          "Are you sure you want to close this ticket? Type `close` to confirm",
        TICKET_CLOSE_TRANSCRIPT: (guild: string, reason: string) =>
          `Your ticket in ${guild} was closed for the reason "${reason}". The transcript is below`,
        TICKET_CLOSER_TITLE: (channel: string) =>
          `Ticket ${channel} was closed`,
        TICKET_CLOSER_CLOSED_BY: "Closed by",
        TICKET_CLOSE_REASON: "Ticket closed",
        TICKET_CLOSE_FORBIDDEN:
          "You must own this ticket or have `Manage Channels` permission to close",
        TICKET_NON_TICKET: "This command can only be ran in ticket channels!",
        TICKETADD_COMMAND_DESCRIPTION: "Add a user to the current ticket",
        TICKET_ADD_NOBODY: "You need to provide a member to add",
        TICKET_ADD_FORBIDDEN:
          "You must own this ticket or have `Manage Channels` permission to add members",
        TICKET_ADD_REASON: (author: string, id: string) =>
          `Added to ticket by ${author} (${id})`,
        TICKETREMOVE_COMMAND_DESCRIPTION:
          "Remove a user from the current ticket",
        TICKET_REMOVE_NOBODY: "You need to provide a member to remove",
        TICKET_REMOVE_FORBIDDEN:
          "You must own this ticket or have `Manage Channels` permission to remove members",
        TICKET_REMOVE_AUTHOR: "You cannot remove the ticket author",
        TICKET_REMOVE_NOT_FOUND: "You can't remove someone who isn't even here",
        TICKET_REMOVE_REASON: (author: string, id: string) =>
          `Removed from ticket by ${author} (${id})`,
        TRANS_COMMAND_DESCRIPTION: "Generate a trans pride avatar",
        TEST_COMMAND_DESCRIPTION: "test?",
        UNBAN_LOG_AUTHOR: (user: string) => `Unban | ${user}`,
        UNBAN_SUCCESS: (user: string, guild: string) =>
          `${constants.emojis.success} **${user}** has been unbanished from ${guild}.`,
        UNBAN_FAILED_NO_BAN:
          "Don't quote me on this but uh, I think a user needs to be banned before you can unban them and they do not appear to be banned",
        UNBAN_FAILED_ENTRY:
          "Failed to create mod log entry, user was not unbanned.",
        UNBAN_FAILED_UNBAN: "Failed to unban user, please try again.",
        UNBAN_FAILED_UNBAN_AND_ENTRY:
          "Failed to unban user and was unable to delete the created mod log entry.",
        UNBAN_COMMAND_DESCRIPTION: "Unban a user from the server",
        UNBAN_USER_REQUIRED: "You must provide a user to unban",
        UNBAN_AUTOMATIC: "Time's up!",
        UNBLOCK_LOG_AUTHOR: (blockee: string) => `Unblock | ${blockee}`,
        UNBLOCK_SUCCESS: (blockee: string) =>
          `${constants.emojis.success} **${blockee}** has been unblocked.`,
        UNBLOCK_FAILED_ENTRY:
          "Failed to create mod log entry, user/role was not unblocked.",
        UNBLOCK_FAILED_BLOCK: "Failed to unblock user/role, please try again.",
        UNBLOCK_FAILED_BLOCK_AND_ENTRY:
          "Failed to unblock user and was unable to delete the created mod log entry.",
        UNBLOCK_COMMAND_DESCRIPTION:
          "Unblock a user or role and allow them to chat in this channel",
        UNBLOCK_ARG_REQUIRED:
          "You must provide a user or role to unblock from this channel",
        UNMUTE_AUTOMATIC: "Time's up!",
        UNMUTE_AUTO_FAIL: (
          member: string,
          reason: string
        ) => `Failed to unmute ${member} with reason "${reason}"
Please remove the role manually.`,
        UNMUTE_UNKNOWN_REMOVED: `${constants.emojis.warning} My records don't show any indication of that user being muted, but I've gone ahead and removed the mute anyways`,
        UNMUTE_LOG_AUTHOR: (user: string) => `Unmute | ${user}`,
        UNMUTE_SUCCESS: (user: string) =>
          `${constants.emojis.success} **${user}** has been unmuted.`,
        UNMUTE_FAILED_UNKNOWN:
          "According to my records, that user was not muted and I was unable to unmute them.",
        UNMUTE_FAILED_NOT_MUTED:
          "According to my records & the user's roles, they were not muted.",
        UNMUTE_FAILED_FORBIDDEN:
          "I seem to be lacking permission to unmute this user.",
        UNMUTE_FAILED_ENTRY:
          "Failed to create mod log entry, user was not unmuted.",
        UNMUTE_FAILED_UNMUTE: "Failed to unmute user, please try again.",
        UNMUTE_FAILED_UNMUTE_AND_ENTRY:
          "Failed to unmute user and was unable to delete the created mod log entry.",
        UNMUTE_FAILED_DB_REMOVE: `There may have been an error while removing the mute from my database.
If the user gets automatically muted again, just try unmute them again and it'll likely work`,
        UNMUTE_COMMAND_DESCRIPTION: "Unmute a user",
        UNMUTE_USER_REQUIRED: "You must provide a user to unmute!",
        UNPLONK_LOG_AUTHOR: (user: string) => `Unblacklist | ${user}`,
        VANITYURL_COMMAND_DESCRIPTION:
          "Creates a vanity invite for your Discord using inv.wtf",
        VANITYURL_CODE_REQUIRED:
          'You must provide a code (and optional invite) to create a vanity url or "delete" to delete your existing vanity url',
        VANITYURL_REGEX_FAIL:
          "Vanity URLs can only contain characters A-Z0-9 and be between 3 and 10 characters",
        VANITYURL_ALREADY_EXISTS: "That code is already in use!",
        VANITYURL_INVITE_CREATE_REASON:
          "Creating an invite to be used with the server's custom inv.wtf vanity",
        VANITYURL_INVITE_FAILED:
          "I failed to find an invite to use. Try providing one after your custom code",
        VANITYURL_BLACKLISTED:
          "This guild has been blacklisted from vanity features",
        VANITYURL_CREATED: (code: string, dev: boolean) =>
          `Your Vanity URL is <https://${dev ? "test." : ""}inv.wtf/${code}>`,
        VCROLE_ADD_REASON: "Giving VC role",
        VCROLE_REMOVE_REASON: "Removing VC role",
        VCROLE_COMMAND_DESCRIPTION:
          "Automatically assign a role to a user when they join a voice channel",
        VCROLE_CHANNEL_REQUIRED:
          "You must provide a channel to set or reset the vcrole for",
        VCROLE_ROLE_REQUIRED:
          "That channel does not have an existing vc role, you'll need to provide a role to set one",
        VCROLE_RESET:
          "Successfully reset the vc role for that channel and removed the role from members currently in the voice channel",
        VCROLE_RESET_FAILED:
          "Failed to reset vc role for that channel, try again with your fingers crossed, that might help",
        VCROLE_SET: (channel: string, role: string) =>
          `Successfully set the vc role for ${channel} to ${role}`,
        VCROLE_SET_FAILED:
          "Failed to set vc role for that channel, try again with your fingers crossed, that might help",
        WARN_FAILED_ENTRY:
          "User was not warned due to an error logging the warn",
        WARN_LOG_AUTHOR: (user: string) => `Warn | ${user}`,
        WARN_LOG_DM_FAIL: "Unable to send DM, user was not warned.",
        WARN_DM: (guild: string, reason: string) =>
          `You were warned in ${guild} for "${reason}"`,
        WARN_SUCCESS: (user: string, times: string) =>
          `${constants.emojis.success} **${user}** has been warned for the ${times} time.`,
        WARN_FAIL: (user: string, times: string) =>
          `${constants.emojis.warning} **${user}** was not warned due to having DMs off. The warning has been logged and is their ${times} warning.`,
        WARN_COMMAND_DESCRIPTION: "Warn a user",
        WARN_REASON_MISSING: "You must provide a reason to warn a user",
        WARNINGS_COMMAND_DESCRIPTION: "View warnings for a user",
        WARNINGS_NONE_FOUND: "No warnings found, they have been a good user :)",
        CLEARWARNINGS_COMMAND_DESCRIPTION:
          "Clear warnings, either by user or by case id",
        CLEARWARNINGS_ARGUMENT_REQUIRED:
          "You must provide a member or case id to clear warn(s)",
        CLEARWARN_CASEID_REQUIRED:
          'You must provide a case id when using "clearwarn" or "clearwarning"',
      },
      enabled: true,
    });
  }
}
