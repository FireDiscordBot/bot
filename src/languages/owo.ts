import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";

export default class owo extends Language {
  constructor() {
    super("owo", {
      language: {
        USER_NOT_FOUND: "Usew not found! Twy use an ID instead.",
        MEMBER_NOT_FOUND: "Membew not found! Twy use an ID instead.",
        CHANNEL_NOT_FOUND: "Channew not found! Twy use an ID instead.",
        ROLE_NOT_FOUND: "Wowe not found! Twy use an ID instead.",
        INVALID_USER_ID: "Usew not found! Make suwe the ID is vawid.",
        INVALID_MEMBER_ID: "Channew not found! Twy use an ID instead.",
        INVALID_CHANNEL_ID: "Channew not found! Make suwe the ID is vawid.",
        INVALID_ROLE_ID: "Wowe not found! Make suwe the ID is vawid.",
        INVALID_SNOWFLAKE:
          "Usew not found and awgument is not a vawid snowfwake. Twy using an ID if you want to find a usew.",
        INVALID_MEMBER_ROLE_CHANNEL:
          "That is not a vawid membew, wowe ow channew. Make suwe the name ow ID you'we pwoviding is vawid.",
        INVALID_MESSAGE:
          "Message not found! Make suwe you'we giving a vawid id/wink.",
        UNKNOWN_COMMAND: "Command not found",
        COMMAND_OWNER_ONLY: "Onwy my ownew can use this command",
        COMMAND_SUPERUSER_ONLY:
          "Onwy a sewect few awe powewfuw enyough to use this command",
        COMMAND_MODERATOR_ONLY:
          "Onwy those stwong enough to wiewd the ban hammew (modewatows) can use this command. If you have nyot set any modewatows, onwy those with **Manyage Sewvew** can use this command.",
        COMMAND_GUILD_ONLY: (invite: string) =>
          `You can onwy use this command in a sewvew. You can invite me to a sewvew at <${invite}>`,
        COMMAND_PREMIUM_GUILD_ONLY:
          "Onwy pwemium guiwds can use this command. Weawn mowe at https://inv.wtf/premium",
        COMMAND_PREMIUM_USER_ONLY:
          "Onwy usews with a cuwwent pwemium subscwiption can use this command. Weawn mowe at https://inv.wtf/premium",
        COMMAND_EXPERIMENT_REQUIRED: "The maze wasn't meant fow you.",
        COMMAND_ACCOUNT_TOO_YOUNG:
          "Youw account has been cweated too wecentwy!",
        COMMAND_GUILD_LOCKED:
          "This command is westwicted to cewtain guiwds and this guiwd is not one of them.",
        COMMAND_ERROR_CONCURRENCY:
          // For different languages, you may want to change the "hold your horses" bit as it may not make sense in that language
          "Whoa, howd youw howses! Wait fow the command to finish befowe wunning it again",
        COMMAND_ERROR_CACHE: "Something went wwong whiwe checking my cache",
        COMMAND_ERROR_GENERIC: (id: string) =>
          `Something went wwong whiwe wunning ${id}`,
        SLASH_COMMAND_HANDLE_FAIL: "I faiwed to handwe that swash command",
        // this is used when it'd react with the success emoji
        // but you can't react to the slash command message when responding
        // with no source or the source message isn't found
        SLASH_COMMAND_HANDLE_SUCCESS: "Command wan successfuwwy!",
        SLASH_COMMAND_BOT_REQUIRED: (invite: string) =>
          `This command wequiwes you to be in a sewvew & have the bot pwesent. You can invite it @ <${invite}>`,
        USER_SNOWFLAKE_ARGUMENT_DESCRIPTION:
          "A mention, usewname, usew id ow any vawid snowfwake",
        HELLO_PREFIX: (prefix: string) =>
          `Hey! My pwefix hewe is \`${prefix}\` ow you can mention me >w<`,
        ERROR_ROLE_UNUSABLE:
          "This wowe cannot be used as it is eithew managed by an integwation ow highew than my top wowe",
        ERROR_NO_KSOFT:
          "Unabwe to use KSoft.Si API due to wack of authentication",
        NO_MODERATORS_SET: "Thewe awe no mowodewatows set in this guiwd.",
        MORE_INTEGRATIONS:
          "Want mowe integwations? Use the suggest command to suggest some! >w<",
        RAW: "Waw",
        AGO: " ago", // Used for dates, e.g. 20 seconds ago. Make sure to keep the space at the start
        FROM_NOW: " fwom now", // Also used for dates, e.g. 20 seconds from now.
        UUID: "UUID",
        DATE: "Date",
        TYPE: "Type",
        ROLE: "Wole",
        ICON: "Icon",
        UNTIL: "Untiw",
        AFTER: "Aftew",
        TOPIC: "Topic",
        LINKS: "Winks",
        ABOUT: "About",
        ROLES: "Wowes",
        NOTES: "Notes",
        TITLE: "Titwe",
        STATS: "Stats",
        GUILD: "Guiwd",
        EMOJI: "Emoji",
        ERROR: "Ewwow",
        USERS: "Usews",
        OWNER: "Ownew",
        BEFORE: "Befowe",
        CLICKS: "Cwicks",
        GUILDS: "Guiwds",
        INVITE: "Invite",
        STATUS: "Status",
        REGION: "Wegion",
        REASON: "Weason",
        JOINED: "Joined",
        CHANNEL: "Channew",
        MESSAGE: "Message",
        SUBJECT: "Subject",
        MEMBERS: "Membews",
        WARNING: "Wawning",
        MENTION: "Mention",
        CREATED: "Cweated",
        JUMP_URL: "Jump URL",
        NICKNAME: "Nickname",
        CHANNELS: "Channews",
        CATEGORY: "Categowy",
        SLOWMODE: "Slowmode",
        ACTIVITY: "Activity",
        NO_TOPIC: "No Topic",
        DM_CHANNEL: "Ouw DMs",
        VARIABLES: "Vawiabwes",
        TIMESTAMP: "Timestamp",
        WORKER_ID: "Wowkew ID",
        INCREMENT: "Incwement",
        MODERATOR: "Modewatow",
        ATTACHMENT: "Attachment",
        PROCESS_ID: "Pwocess ID",
        PINNED_BY: "Pinned By",
        STATISTICS: "Statistics",
        CUSTOM_URL: "Custom URL",
        INVITED_BY: "Invited By",
        CREATED_BY: "Cweated By",
        DELETED_BY: "Deweted By",
        VIEWABLE_BY: "Viewabwe By",
        ATTACHMENTS: "Attachments",
        DESCRIPTION: "Descwiption",
        INVITE_USED: "Invite Used",
        CREATED_GUILD: "Cweated Guiwd",
        JOIN_POSITION: "Join Position",
        CLICK_TO_VIEW: "Cwick To View", // message/attachment link
        ADDED_FEATURES: "Added Featuwes",
        SYSTEM_CHANNEL: "System Channew",
        ACCOUNT_CREATED: "Account Cweated",
        REMOVED_FEATURES: "Wemoved Featuwes",
        ADDED_OVERWRITES: "Added Pewmissions",
        VERIFICATION_LEVEL: "Vewification Wevew",
        REMOVED_OVERWRITES: "Wemoved Pewmissions",
        EXPLICIT_CONTENT_FILTER: "Expwicit Content Fiwtew",
        REGION_DEPRECATED:
          "<:wumpus_land:759529118671831040> Depwecated Wegion",
        REGIONS: {
          brazil: "🇧🇷 Bwaziw",
          europe: "🇪🇺 Euwope",
          hongkong: "🇭🇰 Hong Kong",
          india: "🇮🇳 India",
          japan: "🇯🇵 Japan",
          russia: "🇷🇺 Wussia",
          singapore: "🇸🇬 Singapowe",
          southafrica: "🇿🇦 Singapowe",
          sydney: "🇦🇺 Sydney",
          "us-central": "🇺🇸 Centwaw US",
          "us-south": "🇺🇸 US South",
          "us-east": "🇺🇸 US East",
          "us-west": "🇺🇸 US West",
        },
        FEATURES: {
          ENABLED_DISCOVERABLE_BEFORE: "Enabwed Discowovewabwe Befowe",
          WELCOME_SCREEN_ENABLED: "Wewcome Scween",
          ANIMATED_ICON: "Animated Icon",
          INVITE_SPLASH: "Invite Spwash",
          DISCOVERABLE: "[Discowovewabwe](https://discord.com/guild-discovery)",
          MORE_EMOJI: "Mowe Emoji",
          FEATURABLE: "Featuwuabwe",
          VANITY_URL: "Vanity URL",
          COMMUNITY: "[Commuwunity](https://dis.gd/communityservers)",
          PARTNERED: "[Pawtnewed](https://dis.gd/partners)",
          COMMERCE: "[Stowe Channews](https://dis.gd/sellyourgame)",
          VERIFIED: "[Vewified](https://dis.gd/vfs)",
          BANNER: "Bannew",
          NEWS:
            "[Annowouncement Channews](https://support.discord.com/hc/en-us/articles/360032008192)",
          // CUSTOM FEATUWUES
          PREMIUM:
            "<:firelogo:665339492072292363> [Pwemiuwum](https://gaminggeek.dev/premium)",
          ADDMOD_COMMAND_DESCRIPTION:
            "Add a membew/wowe as a mowodewatow. Wun the command again to wemuv.",
          AUTOROLE_COMMAND_DESCRIPTION:
            "Automaticawwy add a wowe to a usew/bot when they join/send theiw fiwst message",
          AUTOROLE_ROLE_REQUIRED:
            "You can't automaticawwy give nothing, you need to pwovide a wowe",
          AUTOROLE_INVALID_FLAGS: "You cannot combine --bot and --delay",
          AUTOROLE_DISABLED:
            "Autowowe has been disabwed, usews wiww no wongew weceive a wowe upon join/fiwst message.",
          AUTOROLE_DISABLED_BOT:
            "Autowowe has been disabwed, bots wiww no wongew weceive a wowe upon join.",
          AUTOROLE_ENABLED: (role: string, delay: boolean) =>
            `Autowowe has been enabwed, usews wiww weceive ${role} upon ${
              delay ? "fiwst message" : "join"
            }.`,
          AUTOROLE_ENABLED_BOT: (role: string, delay: boolean) =>
            `Autowowe has been enabwed, bots wiww weceive ${role} upon join.`,
          POWERED_BY_KSOFT: "Powewed by KSoft.Si API",
          AUDIT_ACTION_MEMBER_BAN_ADD: "Banned",
          AUDIT_ACTION_MEMBER_KICK: "Kicked",
          AUDIT_ACTION_BY: (action: string) => `${action} By`, // e.g. Kicked By or Banned By
          MODERATORS_ROLES: "Mowodewatow Wowes",
          NO_MODERATOR_ROLES: "No wowes have been set as mowodewatows.",
          MODERATORS_MEMBERS: "Mowodewatow Membews",
          NO_MODERATOR_MEMBERS: "No membews have been set as mowodewatows.",
          MODERATORS_REMOVE_INVALID: "Invawid Mowodewatows",
          MODERATORS_REMOVED: (invalid: string[]) =>
            `I have wemoved some mowodewatows as a matching wowe/membew couwd not be found...\nThe wemoved ids awe: ${invalid.join(
              ", "
            )}`,
        },
        AUTODECANCER_COMMAND_DESCRIPTION:
          'Toggwe wenaming those with "cancewous" (non-ascii) names',
        AUTODECANCER_ENABLED:
          'Enabwed autodecancew. **New** usews with "cancewous" (non-ascii) names wiww be wenamed',
        AUTODECANCER_DISABLED:
          'Disabwed autodecancew. **New** usews with "cancewous" (non-ascii) names wiww no wongew be wenamed',
        AUTODECANCER_REASON:
          "Name changed due to auto-decancew. The name contains non-ascii chawactews",
        AUTODECANCER_RESET_REASON: "Name is fuwwy ascii.",
        AUTODECANCER_USERNAME_REASON:
          "Nickname is non-ascii wheweas usewname is, wemoving nickname.",
        AUTODEHOIST_COMMAND_DESCRIPTION:
          "Toggwe wenaming those with howoisted names",
        AUTODEHOIST_ENABLED:
          "Enabwed autodehoist. **New** usews with howoisted names wiww be wenamed",
        AUTODEHOIST_DISABLED:
          "Disabwed autodehoist. **New** usews with howoisted names wiww no wongew be wenamed",
        AUTODEHOIST_REASON:
          "Name changed due to auto-dehoist. The name stawts with a hoisted chawactew",
        AUTODEHOIST_RESET_REASON: "Name is no wongew hoisted.",
        AUTODEHOIST_USERNAME_REASON:
          "Nickname is hoisted wheweas usewname is not, wemoving nickname.",
        AVATAR_COMMAND_DESCRIPTION: "Get a usew's avataw",
        BADNAME_COMMAND_DESCRIPTION:
          "Change the name used fow auto dehoist/decancew",
        BADNAME_NO_CHANGES: `I did absowutewy nothing because that's awweady set as the "bad name"`,
        BADNAME_SET: (name: string) =>
          `I have set the "bad name" to ${name}. This wiww **not** wename existing usews`,
        BADNAME_RESET: `I have weset the "bad name" to John Doe 0000 (with 0000 being theiw discwiminatow).
This wiww **not** wename existing usews`,
        BAN_LOG_AUTHOR: (user: string) => `Ban | ${user}`,
        BAN_DM: (guild: string, reason: string) =>
          `You wewe banned fwom ${guild} fow "${reason}"`,
        BAN_DM_FAIL: "Unabwe to DM usew, they may have DMs off ow bwocked me",
        BAN_SUCCESS: (user: string, guild: string) =>
          `${constants.emojis.success} **${user}** has been banished fwom ${guild}.`,
        BAN_FAILED_ENTRY:
          "Faiwed to cweate mod log entwy, usew was not banned.",
        BAN_FAILED_BAN: "Faiwed to ban usew, pwease twy again.",
        BAN_FAILED_BAN_AND_ENTRY:
          "Faiwed to ban usew and was unabwe to dewete the cweated mod log entwy.",
        BAN_COMMAND_DESCRIPTION:
          "Ban a usew fwom the sewvew. Use the --days fwag to dewete message histowy",
        BAN_USER_REQUIRED: "You must pwovide a usew to ban!",
        BAN_INVALID_DAYS: "Days must be a numbew fwom 1 to 7",
        BLOCK_LOG_AUTHOR: (blockee: string) => `Bwock | ${blockee}`,
        BLOCK_SUCCESS: (blockee: string) =>
          `${constants.emojis.success} **${blockee}** has been bwocked.`,
        BLOCK_FAILED_ENTRY:
          "Faiwed to cweate mod log entwy, usew/wowe was not bwocked.",
        BLOCK_FAILED_BLOCK: "Faiwed to bwock usew/wowe, pwease twy again.",
        BLOCK_FAILED_BLOCK_AND_ENTRY:
          "Faiwed to bwock usew and was unabwe to dewete the cweated mod log entwy.",
        BLOCK_COMMAND_DESCRIPTION:
          "Bwock a usew ow wowe fwom chatting in the cuwwent channew",
        BLOCK_ARG_REQUIRED:
          "You must pwovide a usew ow wowe to bwock fwom chatting in the cuwwent channew!",
        CHANNELCREATELOG_AUTHOR: (type: string, guild: string) =>
          `${
            type.charAt(0).toUpperCase() + type.toLowerCase().slice(1)
          } Channew Cweate | ${guild}`,
        CHANNELCREATELOG_MUTE_PERMS_FAIL: `I was unabwe to set pewmissions fow the muted wowe in this channew, usews may be abwe to bypass mutes hewe.
Make suwe I have pewmission to manage wowes`,
        CHANNELDELETELOG_AUTHOR: (type: string, guild: string) =>
          `${
            type.charAt(0).toUpperCase() + type.toLowerCase().slice(1)
          } Channew Dewete | ${guild}`,
        COMMAND_COMMAND_DESCRIPTION: "Enabwe/disabwe a command in youw sewvew",
        CHANNELUPDATELOG_AUTHOR: (type: string, channel: string) =>
          `${
            type.charAt(0).toUpperCase() + type.toLowerCase().slice(1)
          } Channew Update | ${channel}`,
        COMMAND_DISABLE_FORBIDDEN: "You cannot disabwe this command!",
        COMMAND_ENABLE: (command: string) => `Successfuwwy enabwed ${command}!`,
        COMMAND_DISABLE: (command: string) =>
          `Successfuwwy disabwed ${command}, onwy modewatows can use it now.`,
        COMMAND_NO_ARG: "You need to pwovide a command to toggwe",
        DEBUG_COMMAND_DESCRIPTION:
          "Command not wowking? Use this command to twy debug the issue.",
        DEBUG_NO_COMMAND: "You must pwovide a vawid command to debug",
        DEBUGGING_DEBUG: "Debug command is wowking",
        DEBUG_PERMS_PASS: "No pewmissiowons missing",
        DEBUG_REQUIRES_PERMS:
          "This command wequiwes extwa pewmissions. You'ww need to debug in a sewvew to see pewmission info",
        DEBUG_PERMS_CHECKS_FAIL: "Pewmissiowon Checks Faiwed!",
        DEBUG_PERMS_FAIL: (userMissing: string[], clientMissing: string[]) => {
          return {
            user: userMissing.length
              ? `You awe missing the pewmissiowon${
                  userMissing.length > 1 ? "s" : ""
                } ${userMissing.join(", ")}`
              : null,
            client: clientMissing.length
              ? `I am missing the pewmissiowon${
                  clientMissing.length > 1 ? "s" : ""
                } ${clientMissing.join(", ")}`
              : null,
          };
        },
        DEBUG_COMMAND_DISABLE_BYPASS: "Command is disabwed buwt u awe bypassed",
        DEBUG_COMMAND_DISABLED: "Command is disabwed.",
        DEBUG_COMMAND_NOT_DISABLED: "Command is not disabwed",
        DEBUG_MUTE_BYPASS: (channel: string, bypass: string[]) =>
          `The fowwowing usews/wowes wiww bypass mutes in ${channel}\n${bypass.join(
            ", "
          )}`,
        DEBUG_MUTE_NO_BYPASS: (channel: string) =>
          `Nobody can bypass mutes in ${channel}`,
        DEBUG_NO_EMBEDS: "I cannot send embeds",
        DEBUG_ISSUES: (issues: string[]) =>
          issues.length ? `${issues.length} issues found` : "No issues found",
        DESC_COMMAND_DESCRIPTION:
          "Set the descwiption fow the sewvew that shows in Vanity URLs",
        DESC_NO_VANITY: (prefix: string) =>
          `You must set a vanity url with \`${prefix}vanityurl\` befowe you can set a descwiption`,
        DESC_FAILED: "Faiwed to set guiwd descwiption.",
        DESC_SET: "Successfuwwy set guiwd descwiption!",
        DESC_RESET: "Successfuwwy weset guiwd descwiption!",
        DEEPFRY_COMMAND_DESCRIPTION:
          "Deepfwy an image ow youw avataw (youw avataw is used if no awgument is pwovided)",
        DEEPFRY_UPLOAD_FAIL: "Deepfwy machine bwoke :c",
        DISCOVER_COMMAND_DESCRIPTION: "Links to Fire's pubwic sewvews page",
        DISCOVER_MESSAGE: `You can find Fire\'s pubwic sewvew wist at <${constants.url.discovery}>
Hint: Use the \`public\` command to get youw sewvew on the wist`,
        DERANK_LOG_AUTHOR: (user: string) => `Dewank | ${user}`,
        DERANK_SUCCESS: (user: string) =>
          `${constants.emojis.success} **${user}** has been dewanked.`,
        DERANK_FAILED: (user: string, roles: string) =>
          `${constants.emojis.warning} **${user}** has been pawtiawwy dewanked as I faiwed to wemove ${roles}`,
        DERANK_FAILED_TO_REMOVE: "Faiwed to wemove",
        DERANK_FAILED_ENTRY:
          "Faiwed to cweate mod log entwy, usew was not dewanked.",
        DERANK_FAILED_DERANK: "Faiwed to dewank usew, pwease twy again.",
        DERANK_FAILED_DERANK_AND_ENTRY:
          "Faiwed to dewank usew (awthough some wowes may have been wemoved) and was unabwe to dewete the cweated mod log entwy.",
        DERANK_COMMAND_DESCRIPTION: "Wemove aww wowes fwom a usew",
        DERANK_USER_REQUIRED: "You must pwovide a usew to dewank!",
        STATUS_LATEST_INCIDENT: "Watest Incident",
        STATUSPAGE_PAGE_DESCRIPTIONS: {
          "all systems operational": "All Systems Opewationaw",
          "partially degraded service": "Pawtiawwy Degwaded Sewvice",
          "minor service outage": "Minow Sewvice Outage",
          "partial system outage": "Pawtiaw System Outage",
          "service under maintenance": "Sewvice Undew Maintenance",
        },
        STATUSPAGE_INCIDENT_STATUS: {
          investigating: "Investigating",
          identified: "Identified",
          monitoring: "Monitowing",
          resolved: "Wesowved",
          scheduled: "Scheduwed",
          "in progress": "In Pwogwess",
          verifying: "Vewifying",
          completed: "Compweted",
          postmortem: "Postmowtem",
        },
        STATUSPAGE_COMPONENT_STATUS: {
          operational: "Opewationaw",
          degraded_performance: "Degwaded Pewmowmance",
          partial_outage: "Pawtiaw Outage",
          major_outage: "Majow Outage",
          under_maintenance: "Undew Maintenance",
        },
        DSTATUS_COMMAND_DESCRIPTION: "Get Discowod's cuwwent status",
        DSTATUS_FETCH_FAIL: "Faiwed to fetch Discowod status",
        STATUS_COMMAND_DESCRIPTION: "Get Fire's cuwwent status",
        STATUS_FETCH_FAIL: "Faiwed to fetch Fire status",
        EIGHTBALL_COMMAND_DESCRIPTION: "Ask the Magic 8-Baww a question",
        EIGHTBALL_NO_QUESTION:
          "That doesn't wook wike a question to me. Awe you fowgetting something?",
        EIGHTBALL_ANSWER: () => {
          const responses = [
            "It is cewtain.",
            "It is decidedwy so.",
            "Without a doubt.",
            "Yes - definitewy.",
            "You may wewy on it.",
            "As I see it, yes.",
            "Most wikewy.",
            "Outwook good.",
            "Yes.",
            "Signs point to yes.",
            "Wepwy hazy, twy again.",
            "Ask again watew.",
            "Bettew not teww you now.",
            "Cannot pwedict now.",
            "Concentwate and ask again.",
            "Don't count on it.",
            "My wepwy is no.",
            "My souwces say no.",
            "Outwook not so good.",
            "Vewy doubtfuw.",
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        },
        EVAL_COMMAND_DESCRIPTION: "wun epic gamew code",
        EVAL_TOO_LONG: (haste?: string) =>
          haste
            ? `Output was too wong, upwoaded to hastebin; ${haste}`
            : "Output was too wong, faiwed to upwoad to hastebin",
        EXPLICIT_CONTENT_FILTER_DISABLED: "No Fiwtew",
        EXPLICIT_CONTENT_FILTER_MEMBERS_WITHOUT_ROLES: "Membews Without Wowes",
        EXPLICIT_CONTENT_FILTER_ALL_MEMBERS: "Aww Membews",
        FILTEREXCL_COMMAND_DESCRIPTION:
          "Excwude a membew/wowe/channew fwom wink fiwtewing",
        FILTEREXCL_LIST_SOME_REMOVED: (mentions: string[], removed: string[]) =>
          mentions.length
            ? `Cuwwentwy excwuded fwom fiwtewing ${
                mentions.length > 1 ? "are" : "is"
              }:\n${mentions.join(
                ", "
              )}\n\nI have awso wemuved some items fwom the excwusion wist due to not being found (membew weft, wowe/channew deweted):\n${removed.join(
                ", "
              )}`
            : `I have weset the fiwtew excwusion wist due to some items fwom the excwusion wist (${removed.join(
                ", "
              )}) not being found (membew weft, wowe/channew deweted)`,
        FILTEREXCL_SET_SOME_REMOVED: (mentions: string[], removed: string[]) =>
          mentions.length
            ? `Successfuwwy set fiwtew excwusion wist to:\n${mentions.join(
                ", "
              )}\n\nI have awso wemuved some items fwom the excwusion wist due to not being found (membew weft, wowe/channew deweted):\n${removed.join(
                ", "
              )}`
            : `I have weset the fiwtew excwusion wist due to the wemaining items on the excwusion wist (${removed.join(
                ", "
              )}) not being found (membew weft, wowe/channew deweted)`,
        FILTEREXCL_LIST: (mentions: string[], removed: string[]) =>
          mentions.length
            ? `Cuwwentwy excwuded fwom fiwtewing ${
                mentions.length > 1 ? "awe" : "is"
              }:\n${mentions.join(", ")}`
            : "No membews, wowes ow channews awe excwuded fwom the fiwtew. Onwy modewatows wiww bypass wink fiwtewing",
        FILTEREXCL_SET: (mentions: string[], removed: string[]) =>
          mentions.length
            ? `Successfuwwy set fiwtew excwusion wist to:\n${mentions.join(
                ", "
              )}`
            : "Successfuwwy weset fiwtew excwusion wist.",
        FILTER_INVITE_LOG_DESCRIPTION: (channel: string) =>
          `**Invite wink sent in** ${channel}`,
        FILTER_INVITE_LOG_CODE: "Invite Code",
        FILTER_INVITE_LOG_LINK: "Invite Wink",
        FILTER_PAYPAL_LOG_DESCRIPTION: (channel: string) =>
          `**PayPaw wink sent in** ${channel}`,
        FILTER_YOUTUBE_LOG_DESCRIPTION: (channel: string) =>
          `**YouTube wink sent in** ${channel}`,
        FILTER_YOUTUBE_VIDEO_LOG_STATS: (
          views: string,
          likes: string,
          dislikes: string,
          comments: string
        ) =>
          `${views} views, ${likes} wikes, ${dislikes} diswikes, ${comments} comments`,
        FILTER_YOUTUBE_CHANNEL_LOG_STATS: (
          subs: string,
          views: string,
          videos: string
        ) => `${subs} subscwibews, ${views} totaw views, ${videos} videos`,
        FILTER_TWITCH_CLIP_LOG_DESCRIPTION: (channel: string) =>
          `**Twitch cwip sent in** ${channel}`,
        FILTER_TWITCH_CHANNEL_LOG_DESCRIPTION: (channel: string) =>
          `**Twitch channew sent in** ${channel}`,
        FILTER_TWITTER_LOG_DESCRIPTION: (channel: string) =>
          `**Twittew wink sent in** ${channel}`,
        FILTER_SHORT_LOG_DESCRIPTION: (channel: string) =>
          `**Showtened wink sent in** ${channel}`,
        GUILD_COMMAND_DESCRIPTION: "Get a genewaw ovewview of the guiwd",
        GUILD_CREATED_AT: (owner: string, created: string) =>
          owner
            ? `**Cweated by ${owner} ${created}**`
            : `**Cweated:** ${created}`,
        GOOGLE_COMMAND_DESCRIPTION: "Speak to the Googwe Assistant",
        GOOGLE_TOO_LONG:
          "<a:okaygoogle:769207087674032129> Youw quewy is too wong!",
        GUILDUPDATELOG_AUTHOR: (name: string) => `Guiwd Update | ${name}`,
        GUILDUPDATELOG_ICON_CHANGED: "Icon Changed",
        GUILDUPDATELOG_SPLASH_CHANGED: "Invite Spwash Changed",
        GUILD_JOIN_POS: (pos: number) => `**Youw Join Position:** ${pos}`,
        GUILD_VERIF_VERY_HIGH: "**Extweme Vewification Wevew**",
        GUILD_VERIF_HIGH: "**High Vewification Wevew**",
        GUILD_VERIF_MEDIUM: "**Medium Vewification Wevew**",
        GUILD_VERIF_LOW: "**Low Vewification Wevew**",
        GUILD_VERIF_NONE: "**No Vewification!**",
        GUILD_FILTER_ALL: "**Content Fiwtew:** All Membews",
        GUILD_FILTER_NO_ROLE: "**Content Fiwtew:** Without Role",
        GUILD_FILTER_NONE: "**Content Fiwtew:** Disabwed",
        GUILD_NOTIFS_MENTIONS: "**Defauwt Notifications:** Onwy @Mentions",
        GUILD_NOTIFS_ALL: "**Defauwt Notifications:** All Messages",
        GUILD_MFA_ENABLED: "**Two-Factow Auth:** Enabwed",
        GUILD_MFA_NONE: "**Two-Factow Auth:** Disabwed",
        GUILD_ABOUT: "» About",
        GUILD_SECURITY: "» Secuwity",
        GUILD_FEATURES: "» Featuwes",
        GUILD_ROLES: "» Roles",
        HELP_COMMAND_DESCRIPTION:
          "Wists all of Fire's commands and pwovides infowmation about them",
        HELP_NO_COMMAND:
          "You must pwovide a vawid command fow info ow no command fow a fuww wist",
        HELP_CREDITS_NAME: "Cwedits",
        HELP_CREDITS_VALUE: `
Fire uses wibwawies/sewvices made by [Ravy](https://ravy.pink/) & [The Aero Team](https://aero.bot/) incwuding
[@aero/sanitizer](https://www.npmjs.com/package/@aero/sanitizer)
[@aero/ksoft](https://www.npmjs.com/package/@aero/ksoft)
[Aether](https://git.farfrom.earth/aero/aether)
`,
        HELP_LINKS_NAME: "Usefuw Winks",
        HELP_LINKS_VALUE: `[Website](${constants.url.website}) - [Suppowt](${constants.url.support}) - [Tewms of Sewvice](${constants.url.terms}) - [Pwivacy Powicy](${constants.url.privacy}) - [Status](${constants.url.fireStatus}) - [Pwemium](${constants.url.premium})`,
        HELP_FOOTER: (prefix: string, cluster: number) =>
          `Use "${prefix}help <command>" fow mowe info about the command | Cwustew ID: ${cluster}`,
        INVCREATE_LOG_AUTHOR: (guild: string) => `Invite Cweate | ${guild}`,
        INVDELETE_LOG_AUTHOR: (guild: string) => `Invite Dewete | ${guild}`,
        INVITE_ROLE_REASON: (invite: string) =>
          `Invite wowe fow invite ${invite}`,
        INVITEROLE_COMMAND_DESCRIPTION:
          "Automaticawwy add a wowe to a usew when they join with a specific invite",
        INVITEROLE_GUILD_INVITE_REQUIRED:
          "You must pwovide a vawid invite and it must be fow this guiwd",
        INVITEROLE_LOG_AUTHOR: "Invite Wowes",
        INVITEROLE_ROLE_INVALID:
          "I am unabwe to give usews this wowe. It must be wowew than my top wowe & youw top rowe, not managed & not the evewyone wowe",
        INVITEROLE_ROLE_REQUIRED:
          "You must pwovide eithew an existing invite to dewete an existing invite wowe ow an invite & wowe to add an invite wowe",
        INVITEROLE_DELETE_SUCCESS: (invite: string, role?: string) =>
          `Successfuwwy deweted invite wowe fow discord.gg\\/${invite}${
            role ? " & " + role : ""
          }`,
        INVITEROLE_DELETE_FAILED: (invite: string, role?: string) =>
          `Faiwed to dewete invite wowe fow discord.gg\\/${invite}${
            role ? " & " + role : ""
          }`,
        INVITEROLE_CREATE_SUCCESS: (
          invite: string,
          role?: string,
          created: boolean = true
        ) =>
          `Successfuwwy ${
            created ? "cweated" : "updated"
          } invite wowe fow discord.gg\\/${invite}${role ? " & " + role : ""}`,
        INVITEROLE_CREATE_FAILED: (invite: string, role?: string) =>
          `Faiwed to cweate invite wowe fow discord.gg\\/${invite}${
            role ? " & " + role : ""
          }`,

        JOINED_WITHOUT_INVITE:
          "Joined without an invite (Pweview Mode/Sewvew Discovewy)",
        JOINMSG_COMMAND_DESCRIPTION:
          "Set the join message and a channew to send it in",
        JOINMSG_ARGUMENT_INVALID:
          'You must pwovide eithew a channew ow "disabwe"',
        JOINMSG_MESSAGE_REQUIRED:
          "You must pwovide a message fow me to send on join. Wun the command without awguments to see the vawiabwes you can uses",
        JOINMSG_SETUP_REQUIRED: `${constants.emojis.error} Pwease pwovide a channew and message fow join messages.`,
        JOINMSG_CURRENT_SETTINGS: (prefix: string) =>
          `**Cuwwent Join Message Settings**\nDo __${prefix}joinmsg disable__ to disabwe join messages`,
        JOINMSG_DISABLE_ALREADY: "Join messages awe awweady disabwed",
        JOINMSG_SET_SUCCESS: (channel: string) =>
          // this will be used in a string with the example since I cannot set allowed mentions with Message#success
          `Join messages wiww show in ${channel}!\nExampwe:`,

        KICK_LOG_AUTHOR: (user: string) => `Kick | ${user}`,
        KICK_SUCCESS: (user: string) =>
          `${constants.emojis.success} **${user}** has been kicked.`,
        KICK_FAILED_ENTRY:
          "Faiwed to cweate mod log entwy, usew was not kicked.",
        KICK_FAILED_KICK: "Faiwed to kick usew, pwease twy again.",
        KICK_FAILED_KICK_AND_ENTRY:
          "Faiwed to kick usew and was unabwe to dewete the cweated mod log entwy.",
        KICK_COMMAND_DESCRIPTION: "Kick a usew fwom the sewvew",
        KICK_USER_REQUIRED: "You must pwovide a usew to kick!",
        SK1ER_NO_REUPLOAD: (user: string) =>
          `${user} I am unabwe to wead youw log to wemove sensitive infowmation & pwovide sowutions to youw issue. Pwease upwoad the log diwectwy :)`,
        SK1ER_REUPLOAD_FETCH_FAIL: (domain: string) =>
          `I was unabwe to wead youw log. Pwease upwoad it diwectwy wathew than using ${domain}`,
        MC_LOG_READ_FAIL:
          "I was unabwe to wead the attachment, twy weupwoad it. If it stiww doesn't wowk, yeww at Geek :)",
        SK1ER_MODCORE_ZIP: (user: string, zip: string) =>
          `${user}, Downwoad the zip fwom ${zip} and then unzip it in \`.minecraft/modcore\` and youw issue shouwd be wesowved.`,
        MC_LOG_HASTE: (
          user: string,
          diff: string,
          msgType: string,
          extra: string,
          haste: string,
          solutions: string
        ) =>
          `${user} ${msgType} a log${
            diff ? " fwom " + diff : ""
          }, ${extra}\n${haste}\n\n${solutions}`,
        SK1ER_NITRO_PERKS_REMOVED: (member: string) =>
          `${member}, Youw nitwo pewks have been wemoved. Boost the sewvew to get them back UwU`,
        SK1ER_NITRO_PERKS_REMOVED_LEFT: (member: string) =>
          `${member} weft and theiw nitwo pewks have been wemoved.`,
        INVITE_COMMAND_DESCRIPTION:
          "Sends a wink to invite me to a diffewent Discowod sewvew.",
        LANGUAGE_COMMAND_DESCRIPTION:
          "Set the wanguage Fire uses. You can add/impwove wanguages on the GitHub wepo, https://inv.wtf/github",
        LANGUAGE_COMMAND_CURRENT: (
          language: string // should always say it in the current language
        ) =>
          `The cuwwent wanguage is ${language}. You can set the wanguage to any of the fowwowing...\n${this.client.languages.modules
            .keyArray()
            .join(
              ", "
            )}\n\nNote: Some wanguages may be unfinished so sometimes you'ww see some Engwish if the stwing hasn't been twanswated`,
        LANGUAGE_COMMAND_HELLO: (type: "guild" | "user") =>
          type == "user"
            ? "Hewwo! You have successfuwwy set Fire's wanguage to OwO :D"
            : "Hewwo! You have successfuwwy set Fire's wanguage to OwO. Want to set it just fow you? Wun the command in DMs",
        LEAVEMSG_COMMAND_DESCRIPTION:
          "Set the weave message and a channew to send it in",
        LEAVEMSG_ARGUMENT_INVALID:
          'You must pwovide eithew a channew ow "disabwe"',
        LEAVEMSG_MESSAGE_REQUIRED:
          "You must pwovide a message fow me to send on weave. Wun the command without awguments to see the vawiabwes you can uses",
        LEAVEMSG_SETUP_REQUIRED: `${constants.emojis.error} Pwease pwovide a channew and message fow weave messages.`,
        LEAVEMSG_CURRENT_SETTINGS: (prefix: string) =>
          `**Cuwwent Weave Message Settings**\nDo __${prefix}leavemsg disable__ to disabwe weave messages`,
        LEAVEMSG_DISABLE_ALREADY: "Weave messages awe awweady disabwed",
        LEAVEMSG_SET_SUCCESS: (channel: string) =>
          // this will be used in a string with the example since I cannot set allowed mentions with Message#success
          `Weave messages wiww show in ${channel}!\nExampwe:`,
        LEVELHEAD_COMMAND_DESCRIPTION: "Get a pwayew's wevewhead info",
        LEVELHEAD_NO_PLAYER:
          "You need to give a pwayew fow me to check the wevewhead of",
        LEVELHEAD_FETCH_FAIL: "Faiwed to fetch wevewhead info",
        LEVELHEAD_MALFORMED_UUID:
          "Mawfowmed UUID. Check the spewwing of the pwayew's name",
        LEVELHEAD_PURCHASED: "Puwchased",
        LEVELHEAD_NOT_PURCHASED: "Not Puwchased",
        LEVELHEAD_EMBED_TITLE: (player: string) => `${player}'s Wevewhead`,
        LEVELHEAD_PROPOSED: "Pwoposed Wevewhead",
        LEVELHEAD_DENIED: "Denied",
        LEVELHEAD_OTHER: "Othew Items",
        LEVELHEAD_TAB: "Tab",
        LEVELHEAD_CHAT: "Chat",
        LEVELHEAD_ADDON_LAYERS: "Addon Head Wayews",
        LINKFILTER_COMMAND_DESCRIPTION:
          "Enabwe diffewent wink fiwtews. Wun the command without awguments to see aww avaiwabwe fiwtews",
        LINKFILTER_FILTER_LIST: (valid: string[]) =>
          `You must choose a vawid fiwtew to toggwe. The avaiwabwe fiwtews awe:\n${valid.join(
            ", "
          )}`,
        LINKFILTER_SET: (enabled: string[]) =>
          `Successfuwwy set wink fiwtews. Cuwwentwy enabwed fiwtews awe:\n${enabled.join(
            ", "
          )}`,
        LINKFILTER_RESET: (enabled: string[]) =>
          "Successfuwwy disabwed aww fiwtews.",
        LOCKDOWN_COMMAND_DESCRIPTION:
          "Wock aww channyews in the sewvew, usefuw fow stopping waidews fwom sending messages. May cause issues if you haven't got pewmissions setup cowwectwy",
        LOCKDOWN_ACTION_REQUIRED:
          "You must pwovide an action! Possibwe actions awe `start`, `end` ow `exclude`",
        LOCKDOWN_EXCLUDE_REQUIRED:
          "You must excwude at weast one categowy fwom sewvew wockdown befowe you can stawt/end wockdown",
        LOCKDOWN_REASON: (user: string, reason: string) =>
          `Sewvew wockdown stawted by ${user} with weason "${reason}".`,
        LOCKDOWN_END_NONE_LOCKED:
          "It seems thewe's no wocked channews so you can't end wockdown as it was nevew stawted",
        LOCKDOWN_END_REASON: (user: string, reason: string) =>
          `Sewvew wockdown ended by ${user} with weason "${reason}".`,
        LOGGING_COMMAND_DESCRIPTION: "Set the channew(s) fow logging",
        LOGGING_INVALID_TYPE: (types: string) =>
          `That is not a vawid log type! Cuwwent types awe ${types}`,
        LOGGING_DISABLED_MODERATION: "Modewation logs have been disabwed.",
        LOGGING_DISABLED_ACTION: "Action logs have been disabwed.",
        LOGGING_DISABLED_MEMBERS: "Membew logs have been disabwed.",
        LOGGING_ENABLED_MODERATION:
          "Modewation logs have been enabwed! Modewation actions such as wawnings, mutes, kicks, bans etc. wiww be logged in youw chosen channew.",
        LOGGING_ENABLED_ACTION:
          "Action logs have been enabwed! Actions such as message edits/dewetes, fiwtewed messages, channew cweates/dewetes etc. wiww be logged in youw chosen channew.",
        LOGGING_ENABLED_MEMBERS:
          "Membew logs have been enabwed! Actions such as membew joins & weaves wiww be logged in youw chosen channew.",
        LYRICS_COMMAND_DESCRIPTION:
          'Get the wywics fow a song. (Fow best wesuwts, use the fowmat "awtist_name song_titwe")',
        LYRICS_NO_QUERY:
          'You need to pwovide a song to get the wywics fow. Fow best wesuwts, use the fowmat "awtist_name song_titwe"',
        LYRICS_NOT_FOUND: (error?: any) =>
          error && error == "Error: No results"
            ? "I couwdn't find any wywics fow that song"
            : "An ewwow occuwwed whiwe twying to fetch wywics.",
        LYRICS_TITLE: (title: string, artist: string) =>
          `${title} by ${artist}`,
        MAKEAMEME_COMMAND_DESCRIPTION:
          'Make youw own meme using the "top text bottom text" fowmat',
        MAKEAMEME_NO_IMAGE:
          "You need to pwovide an image url ow attach an image to make a meme",
        MAKEAMEME_NO_TEXT: "You must pwovide text sepawated by **|**",
        MAKEAMEME_UPLOAD_FAIL: "Faiwed to upwoad spicy meme :c",
        MEMBERJOIN_LOG_AUTHOR: (member: string) => `Membew Join | ${member}`,
        MEMBERJOIN_LOG_PREMIUM_UPSELL_TITLE:
          "Want to see what invite they used?",
        MEMBERJOIN_LOG_PREMIUM_UPSELL_VALUE:
          "Fiwe Pwemium awwows you to do that and mowe.\n[Weawn Mowe](https://gaminggeek.dev/premium)",
        MEMBERLEAVE_LOG_AUTHOR: (member: string) => `Membew Weave | ${member}`,
        MEME_COMMAND_DESCRIPTION: "Get a wandom meme",
        MEME_NOT_FOUND: (error?: any) =>
          error && error == "Error: subreddit not found"
            ? "I couwdn't find any memes. Hewe's an idea! Twy a subweddit that actuawwy exists next time ^w^"
            : "An ewwow occuwwed whiwe twying to fetch some spicy memes.",
        MEME_NSFW_FORBIDDEN:
          "The meme I was given was mawked as NSFW but this channew is not. If you'we wooking fow NSFW memes, head to an NSFW channew, othewwise just twy again",
        MEME_EMBED_TITLE: "Did someone owdew a spicy meme?",
        MEME_EMBED_AUTHOR: (user: string) => `Wequested by ${user}`,
        MEME_SUBREDDIT: "Subweddit",
        MODONLY_COMMAND_DESCRIPTION:
          "Set channews to westwict commands fow mowodewatows",
        MODONLY_NO_CHANNELS:
          "You must pwovide vawid channew(s) sepawated by a comma ow space fow me to toggwe mowodewatow onwy mode in.",
        MODONLY_SET: (channels: string) =>
          `Commands can now onwy be wun by mowodewatows (eithew those set as mods ow those with manage messages) in;\n${channels}.`,
        MODONLY_RESET: "Mowodewatow onwy channews have been weset",
        ADMINONLY_COMMAND_DESCRIPTION:
          "Set channews to westwict commands fow admins",
        ADMINONLY_NO_CHANNELS:
          "You must pwovide vawid channew(s) sepawated by a comma ow space fow me to toggwe admin onwy mode in.",
        ADMINONLY_SET: (channels: string) =>
          `Commands can now onwy be wun by those with the "Manage Sewvew" pewmissiowon in;\n${channels}.`,
        ADMINONLY_RESET: "Admin onwy channews have been weset",
        MODERATOR_ACTION_DISALLOWED:
          "You awe not awwowed to pewfowm this action on this usew!",
        MODERATOR_ACTION_DEFAULT_REASON: "No weason pwovided.",
        MODLOGS_COMMAND_DESCRIPTION: "	View modewation logs fow a usew",
        MODLOGS_NONE_FOUND:
          "No modewation logs found fow that usew, theiw wecowd is squeaky cwean!",
        MODLOGS_CASE_ID: "Case ID",
        MODLOGS_MODERATOR_ID: "Modewatow ID",
        MCSTATUS_COMMAND_DESCRIPTION: "Check the status of Minecwaft sewvices",
        MCSTATUS_FETCH_FAIL: "Faiwed to fetch Minecwaft status",
        MCSTATUS_STATUSES: {
          green: "No Issues",
          yellow: "Some Issues",
          red: "Sewvice Unavaiwabwe",
        },
        MCSTATUS_SERVICES: {
          "minecraft.net": "**Website**",
          "sessionserver.mojang.com": "**Sessions**",
          "authserver.mojang.com": "**Auth**",
          "textures.minecraft.net": "**Skins**",
          "api.mojang.com": "**API**",
        },
        MCUUID_COMMAND_DESCRIPTION: "Get a pwayew's Minecwaft UUID",
        MCUUID_INVALID_IGN: "You must pwovide a vawid IGN to get the UUID of",
        MCUUID_FETCH_FAIL:
          "Faiwed to fetch the UUID, make suwe the IGN is a vawid pwayew",
        MCUUID_UUID: (ign: string, uuid: string) =>
          `${ign} has the UUID ${uuid}`,
        MOD_COMMAND_DESCRIPTION: "Get infowmation about a Sk1er LLC mod",
        MOD_FETCH_FAIL: "Faiwed to fetch mod data",
        MOD_INVALID: "You must pwovide a vawid mod",
        MOD_LIST: "Aww Mods",
        MODCORE_COMMAND_DESCRIPTION: "Get a pwayew's modcowe pwofiwe",
        MODCORE_INVALID_IGN:
          "You must pwovide a vawid IGN to get the ModCowe pwofiwe of",
        MODCORE_PROFILE_FETCH_FAIL: "Faiwed to fetch that pwayew's pwofiwe",
        MODCORE_PROFILE_TITLE: (player: string) =>
          `${player}'s ModCowe Pwofiwe`,
        MODCORE_ENABLED_COSMETICS: "Enabwed Cosmetics",
        MODCORE_NO_COSMETICS: "No Cosmetics",
        MSGEDITLOG_DESCRIPTION: (author: string, channel: string) =>
          `**${author} edited a message in ${channel}**`,
        MSGDELETELOG_DESCRIPTION: (author: string, channel: string) =>
          `**${author}'s message in ${channel} was deweted**`,
        MSGDELETELOG_ATTACH_WARN:
          "__Attachment UWWs awe invawidated once the message is deweted.__",
        MSGDELETELOG_SPOTIFY_ACTIVITY: "Spotify Invite",
        MSGDELETELOG_ACTIVITY: (partyID: string, type: number) =>
          `Pawty ID: ${partyID}\nType: ${this.get("ACTIVITY_TYPES")[type]}`,
        MUTEROLE_COMMAND_DESCRIPTION: "Change the wowe used to mute membews",
        MUTE_ROLE_CREATE_REASON: "Setting up muted wowe...",
        MUTE_LOG_AUTHOR: (user: string) => `Mute | ${user}`,
        MUTE_SUCCESS: (user: string) =>
          `${constants.emojis.success} **${user}** has been muted.`,
        MUTE_SEMI_SUCCESS: (user: string) =>
          `${constants.emojis.warning} **${user}** has been muted but I was unabwe to save it in my database. The mute may not pewsist but if it's not too wong, it shouwd be fine ow you can twy again`,
        MUTE_FAILED_ROLE:
          "Faiwed to cweate muted wowe, pwease ensuwe I have the cowwect pewmissions",
        MUTE_FAILED_ENTRY:
          "Faiwed to cweate mod log entwy, usew was not muted.",
        MUTE_FAILED_MUTE: "Faiwed to mute usew, pwease twy again.",
        MUTE_FAILED_MUTE_AND_ENTRY:
          "Faiwed to mute usew and was unabwe to dewete the cweated mod log entwy.",
        MUTE_COMMAND_DESCRIPTION:
          "Mute a usew eithew untiw manuawwy unmuted ow fow a time (e.g. 1 houw)",
        MUTE_USER_REQUIRED: "You must pwovide a usew to mute!",
        MUTE_FAILED_PARSE_TIME:
          "I was unabwe to pawse the time in youw message",
        MUTE_TIME_TOO_SHORT: "That time is too showt!",
        NITROPERKS_COMMAND_DESCRIPTION:
          "Claim nitwo pewks fow a Minecwaft account (wocked to discord.gg/sk1er)",
        NITROPERKS_INVALID_IGN:
          "You must pwovide a vawid IGN to cwaim nitwo pewks.",
        NITROPERKS_MODULE_ERROR:
          "I can't give nitwo pewks as the Sk1ew moduwe hasn't been woaded, <@287698408855044097> pwobabwy bwoke something... :c",
        NITROPERKS_FAILED:
          "Faiwed to give nitwo pewks! Make suwe youw IGN is vawid and you've puwchased the game.\nThewe may awso be an issue with the Mojang API ow Sk1ew's API causing this issue",
        OSS_COMMAND_DESCRIPTION: "Sends my GitHub wepo wink",
        OSS_MESSAGE:
          "You can find Fire's souwce code at <https://github.com/FireDiscordBot/bot>",
        KEY_PERMISSIONS: "Key Pewmissions",
        PERMISSIONS_TEXT: "Pewmissions",
        PERMISSIONS: {
          // If possible, use the translations from the Discord client here (but we can't, because discord does not have an owo lang)
          CREATE_INSTANT_INVITE: "Cweate Invite",
          KICK_MEMBERS: "Kick Membews",
          BAN_MEMBERS: "Ban Membews",
          ADMINISTRATOR: "Administwatow",
          MANAGE_CHANNELS: "Manage Channews",
          MANAGE_GUILD: "Manage Sewvew",
          ADD_REACTIONS: "Add Weactions",
          VIEW_AUDIT_LOG: "View Audit log",
          PRIORITY_SPEAKER: "Pwiowity Speakew",
          STREAM: "Video",
          VIEW_CHANNEL: "Wead Messages",
          SEND_MESSAGES: "Send Messages",
          SEND_TTS_MESSAGES: "Send TTS Messages",
          MANAGE_MESSAGES: "Manage Messages",
          EMBED_LINKS: "Embed Winks",
          ATTACH_FILES: "Attach Fiwes",
          READ_MESSAGE_HISTORY: "Wead Message Histowy",
          MENTION_EVERYONE:
            "Mention @\u200bevewyone, @\u200bhewe and Aww Wowes",
          USE_EXTERNAL_EMOJIS: "Use Extewnaw Emojis",
          VIEW_GUILD_INSIGHTS: "View Sewvew Insights",
          CONNECT: "Connect",
          SPEAK: "Speak",
          MUTE_MEMBERS: "Mute Membews (voice)",
          DEAFEN_MEMBERS: "Deafen Membews",
          MOVE_MEMBERS: "Move Membews",
          USE_VAD: "Use Voice Activity",
          CHANGE_NICKNAME: "Change Nickname",
          MANAGE_NICKNAMES: "Manage Nicknames",
          MANAGE_ROLES: "Manage Wowes",
          MANAGE_WEBHOOKS: "Manage Webhooks",
          MANAGE_EMOJIS: "Manage Emojis",
        },
        ACTIVITY_TYPES: {
          1: "Join",
          2: "Spectate",
          3: "Wisten",
          5: "Join Wequest",
        },
        MISSING_PERMISSIONS_USER: (permissions: string[], command: string) =>
          `You awe missing ${permissions.join(
            ", "
          )} pewmission(s) to wun ${command}.`,
        MISSING_PERMISSIONS_CLIENT: (permissions: string[], command: string) =>
          `I am missing ${permissions.join(
            ", "
          )} pewmission(s) to wun ${command}.`,
        PING_COMMAND_DESCRIPTION: "Shows you my ping to Discowod's sewvews",
        PING_FOOTER: (shard: number, cluster: number) =>
          `Shawd ID: ${shard} | Cwustew ID: ${cluster}`,
        PING_INITIAL_MESSAGE: "Pinging...",
        PING_FINAL_MESSAGE: "Pong!",
        PINSADDLOG_AUTHOR: (channel: string) => `Message Pinned | ${channel}`,
        PUBLIC_COMMAND_DESCRIPTION:
          "Set youw sewvew to pubwic awwowing it to be visibwe on Fire's Pubwic Sewvews page",
        PUBLIC_VANITY_BLACKLIST:
          "This guiwd has been bwackwisted fwom vanity featuwes and thewefowe cannot be pubwic!",
        PUBLIC_VANITY_REQUIRED: (prefix: string) =>
          `You must set a vanity url with \`${prefix}vanityurl\` befowe youw guiwd can be pubwic`,
        PUBLIC_ENABLED: (vanity: string) =>
          `Youw guiwd is now pubwic & visibwe on <https://inv.wtf/discover>.
 Peopwe wiww be abwe to use youw guiwd's vanity url (<https://inv.wtf/${vanity}>) to join`,
        PUBLIC_ENABLED_LOG: (user: string) =>
          `${constants.statuspage.emojis.operational} This sewvew was set to pubwic by ${user} and wiww appeaw on Fire\'s pubwic sewvew wist`,
        PUBLIC_DISABLED:
          "Youw guiwd is no wongew pubwic and wiww no wongew show on the Fire website",
        PUBLIC_DISABLED_LOG: (user: string) =>
          `${constants.statuspage.emojis.major_outage} This sewvew was manuawwy wemoved fwom Fire\'s pubwic sewvew wist by ${user}`,
        PLONK_COMMAND_DESCRIPTION:
          "Make a usew unabwe to use the best Discowod bot",
        PLONK_USER_REQUIRED: "You must pwovide a usew to pwonk",
        PLAYWRIGHT_ERROR_NOT_READY:
          "Aethew has not woaded fuwwy yet, pwease twy again in a moment.",
        PLAYWRIGHT_ERROR_BAD_REQUEST: "The wequest to Aethew was mawfowmed.",
        PLAYWRIGHT_ERROR_UNKNOWN: "Something went wwong. Twy again watew",
        PREFIX_COMMAND_DESCRIPTION:
          "Set the pwefix used to twiggew Fiwe's command",
        PREFIX_MISSING_ARG: "You must pwovide a new pwefix",
        PREFIX_GLOBAL: `"fire " is a gwobaw pwefix and can be used anywhewe. Thewe's no need to set it as a sewvew pwefix`,
        PREFIX_ALREADY_SET: "That's awweady set as this sewvew's pwefix",
        PREFIX_SET: (old: string, newp: string) =>
          `This sewvew's pwefix has been set fwom "${old}" to "${newp}"`,
        PURGE_COMMAND_DESCRIPTION:
          "Buwk dewete messages with optionaw fwags to sewectivewy dewete messages based on cewtain factows",
        PURGE_AMOUNT_INVALID: "Invawid amount. Minumum is 2, Maximum is 100",
        PURGE_HISTORY_FAIL: "Faiwed to fetch messages",
        PURGE_SUCCESS: (messages: number) =>
          `Successfuwwy deweted **${messages}** messages!`,
        PURGE_FAIL: "Faiwed to puwge messages...",
        PURGE_LOG_DESCRIPTION: (amount: number, channel: string) =>
          `**${amount} messages wewe puwged in ${channel}**`,
        PURGE_LOG_FOOTER: (user: string, channel: string) =>
          `Authow ID: ${user} | Channew ID: ${channel}`,
        PURGED_MESSAGES: "Puwged Messages",
        PURGED_MESSAGES_FAILED: "Faiwed to upwoad messages to hastebin",
        QUOTE_COMMAND_DESCRIPTION: "Quote a message fwom an ID ow URL",
        AUTOQUOTE_COMMAND_DESCRIPTION:
          "Enabwe automatic quoting when a message URL is sent",
        AUTOQUOTE_ENABLED:
          "Successfuwwy enabwed auto quoting. Message winks found in a message wiww be quoted",
        AUTOQUOTE_DISABLED:
          "Successfuwwy disabwed auto quoting. Message winks found in a message wiww no wongew be quoted",
        QUOTE_WEBHOOK_CREATE_REASON:
          "This webhook wiww be used fow quoting messages in this channew",
        QUOTE_EMBED_FROM: (author: string, channel: string) =>
          `Waw embed fwom ${author} in #${channel}`,
        QUOTE_EMBED_FOOTER_ALL: (
          user: string,
          channel: string,
          guild: string
        ) => `Quoted by: ${user} | #${channel} | ${guild}`,
        QUOTE_EMBED_FOOTER_SOME: (user: string, channel: string) =>
          `Quoted by: ${user} | #${channel}`,
        QUOTE_EMBED_FOOTER: (user: string) => `Quoted by: ${user}`,
        RANK_COMMAND_DESCRIPTION:
          "Wist aww avaiwabwe ranks and join a rank if pwovided",
        RANKS_NONE_FOUND: "Seems wike thewe's no ranks set fow this guiwd",
        RANKS_INFO: (role: string, members: string) =>
          `> ${role} (${members} membews)`,
        RANKS_AUTHOR: (guild: string) => `${guild}'s ranks`,
        RANKS_JOIN_REASON: "Joined rank",
        RANKS_JOIN_RANK: (role: string) =>
          `You successfuwwy joined the **${role}** rank.`,
        RANKS_LEAVE_REASON: "Weft rank",
        RANKS_LEFT_RANK: (role: string) =>
          `You successfuwwy weft the **${role}** rank.`,
        RANKS_INVALID_ROLE:
          "That isn't a vawid rank. Use the command without awguments to see a wist of vawid ranks",
        RANKS_INVALID_ROLE_DEL:
          "That isn't a vawid rank. Use the rank command to see a wist of vawid ranks",
        ADDRANK_COMMAND_DESCRIPTION:
          "Add a wowe that usews can join thwough the wank command.",
        RANKS_ALREADY_ADDED: "You can't add a wank twice siwwy",
        DELRANK_COMMAND_DESCRIPTION:
          "Wemove a wank fwom the wist of joinabwe wowes.",
        REDIRECT_SHORT_URL: "Showt URL",
        REDIRECT_COMMAND_DESCRIPTION:
          "Cweate a wediwect to any website using inv.wtf, e.g. inv.wtf/bot.",
        REDIRECT_ARGS_REQUIRED:
          "You must pwovide a code and uww to cweate a wediwect",
        REDIRECT_LIST_AUTHOR: "Youw wediwects",
        REDIRECT_LIST_DESCRIPTION: (
          codes: string[],
          remaining: number,
          prefix: string
        ) =>
          `${codes.join(", ")}
You can cweate ${remaining} mowe wediwects! (Each pwemium sewvew you have gives 5 wediwects)
Use \`${prefix}redirect <code>\` to view infowmation about a wediwect`,
        REDIRECT_NOT_FOUND: "You don't seem to have a wediwect with that code.",
        REDIRECT_URL_INVALID:
          "That URL is invawid! It must be https and not a Discowd invite/inv.wtf URL",
        REDIRECT_REGEX_FAIL:
          "Wediwects can onwy contain chawactews A-Z0-9 and be between 2 and 15 chawactews",
        REDIRECT_ERROR_PREMIUM:
          "You must have an active pwemium subscwiption to cweate wediwects!",
        REDIRECT_CREATED: (code: string, url: string, dev: boolean) =>
          `Wediwect cweated! <https://${
            dev ? "test." : ""
          }inv.wtf/${code}> wiww now wead to <${url}>`,
        REDIRECT_ERROR_LIMIT:
          "You've hit the wimit! You must dewete a wediwect to cweate anothew",
        REDIRECT_ERROR_EXISTS:
          "A Vanity UWW ow Wediwect awweady exists with that code!",
        REMINDER_TIME_UNKNOWN: "an unknown time", // used for time below, e.g. an unknown time ago
        REMINDER_MESSAGE: (text: string, time: string, link?: string) =>
          link
            ? `You asked me ${time} ago to wemind you about "${text}"\n${link}`
            : `You asked me ${time} ago to wemind you about "${text}"`,
        REMIND_COMMAND_DESCRIPTION:
          "Ask me to wemind you something and I'ww wemind you, pwovided Discowd isn't dying",
        REMIND_ARG_DESCRIPTION:
          'Youw wemindew, incwuding the time in the fowmat "X mins X days" etc.',
        REMINDER_MISSING_ARG:
          "I can't wemind you about nothing, you need to pwovide the wemindew text and duwation",
        REMINDER_INVALID_REPEAT:
          "The wepeat fwag vawue is invawid, it must wange fwom 1 to 5",
        REMINDER_SEPARATE_FLAGS:
          "The step and wepeat fwags must be used togethew, they cannot be used individuawwy",
        REMINDER_INVALID_STEP:
          'The step fwag vawue is invawid. Use this fwag to set muwtipwe wemindews with a pwedefined "step" aftew each',
        REMINDER_MISSING_TIME:
          'You need to incwude a duwation fow youw wemindew, e.g. "69 mins" fow 69 minutes',
        REMINDER_MISSING_CONTENT: "I need something to wemind you about...",
        REMINDER_TIME_LIMIT:
          "Wemindews awe cuwwentwy wimited to 6 months. This may incwease in the futuwe",
        REMINDER_TOO_SHORT:
          "If you need a bot to wemind you about something in wess than two minutes, thewe's an issue that you shouwd pwobabwy wook into...",
        REMINDER_STEP_TOO_SHORT:
          "The step fwag vawue must be 2 minutes ow mowe",
        REMINDER_CREATED: (success: string[], failed: string[]) =>
          success.length == 1
            ? `Got it! I'ww wemind you in ${success[0]}`
            : `Got it! I've set wemindews fow the fowwowing times,
${success.map((s) => "- " + s).join("\n")}${
                failed.length
                  ? "\n\nI unfowtunatewy faiwed to set wemindews fow the fowwowing times,\n" +
                    failed.map((f) => "- " + f).join("\n")
                  : ""
              }`,
        REMINDERS_COMMAND_DESCRIPTION: "Wist aww wemindews you have set",
        REMINDERS_NONE_FOUND:
          "You must have a good memowy because I found no wemindews",
        DELREMIND_COMMAND_DESCRIPTION:
          "Dewete a wemindew using the index fwom the wemindews command",
        DELREMIND_ARG_DESCRIPTION:
          "The wemindew you want to dewete. Use the [numbew] fwom the wemindews command",
        DELREMIND_MISSING_ARG: "You need to pwovide a wemindew to dewete",
        DELREMIND_TOO_HIGH: "You don't have that many wemindews",
        DELREMIND_CONFIRM: (reminder: { date: Date; text: string }) =>
          `Wemindew fow ${reminder.date.toLocaleString(this.id)}, ${
            reminder.text
          }\n\nAwe you suwe you want to dewete this wemindew? Say "yes" to dewete.`,
        DELREMIND_NO: "Ok, I won't dewete it",
        DELREMIND_TIME:
          "You didn't wespond quick enough. The wemindew has not been deweted",
        DELREMIND_YES:
          "It is gone! Wemembew, when using this command again, the indexes wiww have changed so make suwe you'we using the wight one",
        ROLEPERSIST_REASON: "Adding pewsisted wowes",
        ROLEPERSIST_COMMAND_DESCRIPTION:
          "Add a wowe(s) that wiww stay with the usew, even if they weave and wejoin.",
        ROLEPERSIST_ROLE_INVALID:
          "I am unabwe to pewsist this wowe. It must be wowew than my top wowe & youw top wowe, not managed & not the evewyone wowe",
        ROLEPERSIST_SELF: "You cannot pewsist wowes to youwsewf!",
        ROLEPERSIST_GOD:
          "You cannot pewsist wowes to someone highew than youwsewf (and I don't mean high on dwugs smh)",
        ROLEPERSIST_MODLOG_REASON: (roles: string[]) =>
          roles.length
            ? `Pewsisted wowes ${roles.join(", ")}`
            : "Wemoved aww pewsisted wowes.",
        ROLEPERSIST_LOG_AUTHOR: (member: string) => `Wowe Pewsist | ${member}`,
        ROLEPERSIST_SUCCESS: (member: string, roles: string[]) =>
          roles.length
            ? `Success! ${member} now has the wowe${
                roles.length > 1 ? "s" : ""
              } ${roles.join(", ")} pewsisted to them. Wemove ${
                roles.length > 1 ? "a" : "the"
              } wowe to unpewsist it`
            : // below should be impossible to get since you remove persisted
              // roles by removing the role from the user but just in case
              `${member} no wongew has any wowes pewsisted to them.`,
        ROLEPERSIST_FAILED: "I was unabwe to pewsist that wowe to that user",
        SKIN_COMMAND_DESCRIPTION: "See a pwayew's Minecwaft skin",
        SKIN_INVALID_IGN: "You must pwovide a vawid IGN to get the skin of",
        SLOWMODE_COMMAND_DESCRIPTION:
          "Set the swowmode fow a channew ow categowy. Use the slowmodeall awias to set it fow aww channews",
        SLOWMODE_GLOBAL_FAIL_SOME: (failed: string[]) =>
          `I set swowmode in some channews but faiwed to set swowmode in ${failed.join(
            ", "
          )}`,
        SLOWMODE_INVALID_TYPE: "You must pwovide a text channew ow categowy",
        SLOWMODE_FAILED: (channels: string[]) =>
          `Faiwed to set swowmode in ${channels.join(", ")}`,
        SK1ER_BETA_MOVED:
          "Beta testing fow Sk1ew LLC mods has been muvd to ouw suppowt sewvew owo! You can join with discord.gg/d4KFR9H",
        STATS_COMMAND_DESCRIPTION: "View cwustew & ovewaww stats.",
        STATS_TITLE: (name: string, version: string) =>
          `Stats fow ${name} [${version}]`,
        STATS_MEMORY_USAGE: "Memowy Usage",
        STATS_DJS_VER: "Discowd.JS Vewsion",
        STATS_NODE_VER: "Node.JS Vewsion",
        STATS_UPTIME: "Uptime",
        STATS_COMMANDS: "Commands",
        STATS_EVENTS: "Events",
        STATS_FOOTER: (manager: number, shard: number) =>
          `PID: ${process.pid} | Cwustew: ${manager} | Shawd: ${shard}`,
        STEAL_COMMAND_DESCRIPTION: "Steaw an emote to use in youw own sewvew",
        STEAL_NOTHING:
          "You'we a tewwibwe cwiminaw, you can't steaw nothing! You must pwovide an emoji to steaw",
        STEAL_INVALID_EMOJI:
          "If you'we going to twy and steaw an emoji, at weast make it a vawid one...\nOthewwise it's a waste of time and you'ww wikewy get caught ¯\\\\_(ツ)\\_/¯",
        STEAL_CAUGHT:
          "Seems wike you wewe caught wed handed whiwe twying to steaw that emoji. You have wetuwned the emoji you attempted to steaw",
        STEAL_STOLEN: (emoji: string) =>
          `Nice! You stowe ${emoji} without getting caught by a nasty ewwow :)`,
        SUGGEST_COMMAND_DESCRIPTION:
          "Suggest a featuwe fow Fire. (Abuse of this command wiww wead to a tempowawy bwackwist fwom Fire. Actuaw suggestions onwy)",
        SUGGESTION_SUCCESS: (card: any) =>
          `Thanks! Youw suggestion was added to the Trello @ <${card.url}>. Make suwe to check it evewy now and then fow a wesponse.
 Abuse of this command __**wiww**__ wesuwt in being temporarily bwackwisted fwom Fire`,
        USER_COMMAND_DESCRIPTION: "Get a genewaw ovewview of a usew.",
        // don't change emote
        USER_SNOWFLAKE_DESCRIPTION: `It wooks wike that isn't a vawid usew, but it is a vawid snowfwake! <:snowflak:784510818556706867>

 A [Snowfwake](https://discord.com/developers/docs/reference#snowflakes) is essentiawwy a unique ID fow a wesouwce (message, usew, channew, etc) which contains a timestamp.

 You can copy the snowfwakes fwom messages in Discowd by wight cwicking on them.
 You must have Devewopew Mode enabwed, which is found in Usew Settings > Appeawance`,
        USER_SNOWFLAKE_BELONGS_TO: (type: string, extra: string) =>
          `**Bewongs To**: ${type} ${extra ? "(" + extra + ")" : ""}`,
        USER_KSOFT_BANNED: (user: string, reason: string, proof: string) =>
          `Banned on [KSoft.Si](https://bans.ksoft.si/share?user=${user}) fow ${reason} - [Pwoof](${proof})`,
        VOTE_COMMAND_DESCRIPTION:
          'Sends a wink to Fire on a wandom bot wist (sends diwect vote wink if you use the "vote" awias)',
        PREMIUM_COMMAND_DESCRIPTION: "i wike money",
        PREMIUM_MISSING_ARGUMENTS:
          "You need to pwovide a guiwd id, usew id and weason to add a pwemium guiwd",
        PREMIUM_DELETE_FAIL: "Faiwed to wemove pwemium.",
        PREMIUM_INSERT_FAIL: "Faiwed to give pwemium.",
        PREMIUM_RELOAD_FAIL: "Faiwed to wewoad pwemium guiwds.",
        RELOAD_COMMAND_DESCRIPTION: "Wewoad a command/wanguage/wistenew/moduwe",
        TAG_COMMAND_DESCRIPTION: "See a wist of aww tags ow view a tag",
        TAG_NONE_FOUND:
          "I seawched neaw and faw and couwd not find any tags... :c",
        TAG_INVALID_TAG: (tag: string) =>
          `Thewe doesn't seem to be a tag cawwed ${tag}`,
        TAG_RAW_COMMAND_DESCRIPTION: "View the waw content of a tag",
        TAGS_RAW_MISSING_ARG:
          "You need to pwovide a tag name to get the waw content of",
        TAG_DELETE_COMMAND_DESCRIPTION: "Dewete a tag",
        TAGS_DELETE_MISSING_ARG:
          "Weww, I can't weawwy dewete nothing can I? Pwovide a tag name to dewete",
        TAG_CREATE_COMMAND_DESCRIPTION: "Cweate a new tag",
        TAGS_CREATE_MISSING_NAME:
          "Youw shiny new tag needs a name, give it one!",
        TAGS_CREATE_MISSING_CONTENT:
          "A tag can't be empty, othewwise it has no puwpose in wife, wike me... :c",
        TAGS_CREATE_COMMAND_NAME:
          "That name is awweady being used by a subcommand, twy a diffewent one",
        TAGS_CREATE_ALREADY_EXISTS:
          "A tag awweady exists with that name. Be owiginaw next time!",
        TAGS_CREATE_LIMIT:
          "You've weached the tag wimit! Upgwade to pwemium fow unwimited tags;\n<https://inv.wtf/premium>",
        TAGS_EDIT_MISSING_NAME:
          "I need to know what tag to edit. Give me the name of an existing tag ^w^",
        TAG_EDIT_COMMAND_DESCRIPTION: "Edit the content of a tag",
        TAGS_EDIT_MISSING_CONTENT:
          "You need to pwovide the new content fow the tag",
        TAGS_EDIT_LIMIT: "This tag cannot be modified!",
        TAG_ALIAS_COMMAND_DESCRIPTION: "Cweate an awias for a tag",
        TAGS_ALIAS_MISSING_NAME:
          "I can't make an awias fow nothing. You need to pwovide an existing tag name",
        TAGS_ALIAS_MISSING_ALIAS:
          "You need to pwovide a new awias fow the tag ow an existing awias to dewete it",
        TAG_LIST: (guild: string) => `${guild}'s tags`,
        TICKET_COMMAND_DESCRIPTION: "Manage ticket configuwation in the sewvew",
        TICKET_MAIN_DESCRIPTION:
          "Hewe awe aww the ticket configuwation commands",
        TICKET_CATEGORY_DESCRIPTION: `Set the categowy wewe tickets awe made. **Setting this enabwes tickets**
Wunning this command without pwoviding a categowy wesets it, thewefowe disabwing tickets`,
        TICKET_LIMIT_DESCRIPTION:
          "Wimit the numbew of tickets a usew can make, 0 = No Wimit",
        TICKET_NAME_DESCRIPTION:
          "Set the name fow tickets. Thewe awe many vawiabwes avaiwabwe fow use in the name",
        TICKETS_DISABLED:
          "I have weset the ticket categowy thewefowe disabwing tickets in this guiwd",
        TICKETS_ENABLED: (category: string) =>
          `Successfuwwy enabwed tickets and set the categowy to ${category}.`,
        TICKETS_INVALID_LIMIT: "Invawid wimit, it must be a numbew fwom 1 to 5",
        TICKET_NAME_LENGTH:
          "Name is too wong, it must be 50 chawactews ow wess",
        TICKET_NAME_SET: (name: string, example: string) =>
          `Successfuwwy set the tickets name to ${name}\nExampwe: ${example}`,
        TICKET_CHANNEL_TOPIC: (author: string, id: string, subject: string) =>
          subject
            ? `Ticket cweated by ${author} (${id}) with subject "${subject}"`
            : `Ticket cweated by ${author} (${id})`,
        TICKET_OPENER_TILE: (author: string) => `Ticket opened by ${author}`,
        TICKET_AUTHOR_LEFT: (author: string) =>
          `The ticket authow (${author}) seems to have weft the sewvew, how sad :(`,
        NEW_COMMAND_DESCRIPTION: "Makes a new ticket",
        NEW_TICKET_CREATING: "Cweating youw ticket...",
        NEW_TICKET_CREATED: (channel: string) =>
          `Successfuwwy made youw ticket, ${channel}`,
        NEW_TICKET_DISABLED: "Tickets awe not enabwed hewe",
        NEW_TICKET_LIMIT: "You have too many tickets open!",
        CLOSE_COMMAND_DESCRIPTION:
          "Cwoses a ticket, upwoads the twanscwipt to action logs channew and sends to the ticket authow",
        TICKET_WILL_CLOSE:
          "Awe you suwe you want to cwose this ticket? Type `close` to confiwm",
        TICKET_CLOSE_TRANSCRIPT: (guild: string, reason: string) =>
          `Youw ticket in ${guild} was cwosed fow the weason "${reason}". The twanscwipt is bewow`,
        TICKET_CLOSER_TITLE: (channel: string) =>
          `Ticket ${channel} was cwosed`,
        TICKET_CLOSER_CLOSED_BY: "Cwosed by",
        TICKET_CLOSE_REASON: "Ticket cwosed",
        TICKET_CLOSE_FORBIDDEN:
          "You must own this ticket ow have `Manage Channews` pewmission to cwose",
        TICKET_NON_TICKET: "This command can onwy be wan in ticket channews!",
        TICKETADD_COMMAND_DESCRIPTION: "Add a usew to the cuwwent ticket",
        TICKET_ADD_NOBODY: "You need to pwovide a membew to add",
        TICKET_ADD_FORBIDDEN:
          "You must own this ticket ow have `Manage Channews` pewmission to add membews",
        TICKET_ADD_REASON: (author: string, id: string) =>
          `Added to ticket by ${author} (${id})`,
        TICKETREMOVE_COMMAND_DESCRIPTION:
          "Wemove a usew fwom the cuwwent ticket",
        TICKET_REMOVE_NOBODY: "You need to pwovide a membew to wemove",
        TICKET_REMOVE_FORBIDDEN:
          "You must own this ticket ow have `Manage Channews` pewmission to wemove membews",
        TICKET_REMOVE_AUTHOR: "You cannot wemove the ticket authow",
        TICKET_REMOVE_NOT_FOUND: "You can't wemove someone who isn't even hewe",
        TICKET_REMOVE_REASON: (author: string, id: string) =>
          `Wemoved fwom ticket by ${author} (${id})`,
        TRANS_COMMAND_DESCRIPTION: "Genewate a twans pwide avataw",
        TEST_COMMAND_DESCRIPTION: "test?",
        UNBAN_LOG_AUTHOR: (user: string) => `Unban | ${user}`,
        UNBAN_SUCCESS: (user: string, guild: string) =>
          `${constants.emojis.success} **${user}** has been unbanished fwom ${guild}.`,
        UNBAN_FAILED_ENTRY:
          "Faiwed to cweate mod log entwy, usew was not unbanned.",
        UNBAN_FAILED_NO_BAN:
          "Don't quote me on this but uh, I think a usew needs to be banned befowe you can unban them and they do not appeaw to be banned",
        UNBAN_FAILED_UNBAN: "Faiwed to unban usew, pwease twy again.",
        UNBAN_FAILED_UNBAN_AND_ENTRY:
          "Faiwed to unban usew and was unabwe to dewete the cweated mod log entwy.",
        UNBAN_COMMAND_DESCRIPTION: "Unban a usew fwom the sewvew",
        UNBAN_USER_REQUIRED: "You must pwovide a usew to unban",
        UNBLOCK_LOG_AUTHOR: (blockee: string) => `Unbwock | ${blockee}`,
        UNBLOCK_SUCCESS: (blockee: string) =>
          `${constants.emojis.success} **${blockee}** has been unbwocked.`,
        UNBLOCK_FAILED_ENTRY:
          "Faiwed to cweate mod log entwy, usew/wowe was not unbwocked.",
        UNBLOCK_FAILED_BLOCK: "Faiwed to unbwock usew/wowe, pwease twy again.",
        UNBLOCK_FAILED_BLOCK_AND_ENTRY:
          "Faiwed to unbwock usew and was unabwe to dewete the cweated mod log entwy.",
        UNBLOCK_COMMAND_DESCRIPTION:
          "Unbwock a usew ow wowe and awwow them to chat in this channew",
        UNBLOCK_ARG_REQUIRED:
          "You must pwovide a usew ow wowe to unbwock fwom this channew",
        UNMUTE_AUTOMATIC: "Time's up!",
        UNMUTE_AUTO_FAIL: (
          member: string,
          reason: string
        ) => `Faiwed to unmute ${member} with weason "${reason}"
Pwease wemove the wowe manuawwy.`,
        UNMUTE_UNKNOWN_REMOVED: `${constants.emojis.warning} My wecowds don't show any indication of that usew being muted, but I've gone ahead and wemoved the mute anyways`,
        UNMUTE_LOG_AUTHOR: (user: string) => `Unmute | ${user}`,
        UNMUTE_SUCCESS: (user: string) =>
          `${constants.emojis.success} **${user}** has been unmuted.`,
        UNMUTE_FAILED_UNKNOWN:
          "Accowding to my wecowds, that usew was not muted and I was unabwe to unmute them.",
        UNMUTE_FAILED_NOT_MUTED:
          "Accowding to my wecowds & the usew's wowes, they wewe not muted.",
        UNMUTE_FAILED_FORBIDDEN:
          "I seem to be wacking pewmission to unmute this usew.",
        UNMUTE_FAILED_ENTRY:
          "Faiwed to cweate mod log entwy, usew was not unmuted.",
        UNMUTE_FAILED_UNMUTE: "Faiwed to unmute usew, pwease twy again.",
        UNMUTE_FAILED_UNMUTE_AND_ENTRY:
          "Faiwed to unmute usew and was unabwe to dewete the cweated mod log entwy.",
        UNMUTE_FAILED_DB_REMOVE: `Thewe may have been an ewwow whiwe wemoving the mute fwom my database.
If the usew gets automaticawwy muted again, just twy unmute them again and it'ww wikewy wowk`,
        UNMUTE_COMMAND_DESCRIPTION: "Unmute a usew",
        UNMUTE_USER_REQUIRED: "You must pwovide a usew to unmute!",
        VANITYURL_COMMAND_DESCRIPTION:
          "Cweates a vanity invite fow youw Discowd using inv.wtf",
        VANITYURL_CODE_REQUIRED:
          'You must pwovide a code (and optionaw invite) to cweate a vanity uww ow "dewete" to dewete youw existing vanity uww',
        VANITYURL_REGEX_FAIL:
          "Vanity UWWs can onwy contain chawactews A-Z0-9 and be between 3 and 10 chawactews",
        VANITYURL_ALREADY_EXISTS: "That code is awweady in use!",
        VANITYURL_INVITE_CREATE_REASON:
          "Cweating an invite to be used with the sewvew's custom inv.wtf vanity",
        VANITYURL_INVITE_FAILED:
          "I faiwed to find an invite to use. Twy pwoviding one aftew youw custom code",
        VANITYURL_BLACKLISTED:
          "This guiwd has been bwackwisted fwom vanity featuwes",
        VANITYURL_CREATED: (code: string, dev: boolean) =>
          `Youw Vanity UWW is <https://${dev ? "test." : ""}inv.wtf/${code}>`,
        WARN_FAILED_ENTRY:
          "Usew was not wawned due to an ewwow logging the wawn",
        WARN_LOG_AUTHOR: (user: string) => `Wawn | ${user}`,
        WARN_LOG_DM_FAIL: "Unabwe to send DM, usew was not wawned.",
        WARN_DM: (guild: string, reason: string) =>
          `You wewe wawned in ${guild} fow "${reason}"`,
        WARN_SUCCESS: (user: string, times: string) =>
          `${constants.emojis.success} **${user}** has been wawned fow the ${times} time..`,
        WARN_FAIL: (user: string, times: string) =>
          `${constants.emojis.warning} **${user}** was not wawned due to having DMs off. The wawning has been logged and is theiw ${times} wawning.`,
        WARN_COMMAND_DESCRIPTION: "Wawn a usew",
        WARN_REASON_MISSING: "You must pwovide a weason to wawn a usew",
        WARNINGS_COMMAND_DESCRIPTION: "View wawnings fow a usew",
        WARNINGS_NONE_FOUND: "No wawnings found, they have been a good usew :)",
        CLEARWARNINGS_COMMAND_DESCRIPTION:
          "Cweaw wawnings, eithew by usew ow by case id",
        CLEARWARNINGS_ARGUMENT_REQUIRED:
          "You must pwovide a membew ow case id to cweaw wawn(s)",
        CLEARWARN_CASEID_REQUIRED:
          'You must pwovide a case id when using "clearwarn" ow "clearwarning"',
      },
      enabled: true,
    });
  }
}
