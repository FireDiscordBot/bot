import { constants } from "../../lib/util/constants";
import { Language } from "../../lib/util/language";

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
        INVALID_MESSAGE:
          "Message not found! Make suwe you'we giving a vawid id/wink.",
        UNKNOWN_COMMAND: "Command not found",
        COMMAND_OWNER_ONLY: "Onwy my ownew can use this command",
        COMMAND_SUPERUSER_ONLY:
          "Onwy a sewect few awe powewfuw enyough to use this command",
        COMMAND_GUILD_ONLY: (invite: string) =>
          `You can onwy use this command in a sewvew. You can invite me to a sewvew at <${invite}>`,
        COMMAND_PREMIUM_ONLY:
          "Onwy pwemium guiwds can use this command. Weawn mowe at https://inv.wtf/premium",
        COMMAND_EXPERIMENT_REQUIRED: "The maze wasn't meant fow you.",
        COMMAND_ACCOUNT_TOO_YOUNG:
          "Youw account has been cweated too wecentwy!",
        COMMAND_GUILD_LOCKED:
          "This command is westwicted to cewtain guiwds and this guiwd is not one of them.",
        COMMAND_ERROR_CONCURRENCY:
          // For different languages, you may want to change the "hold your horses" bit as it may not make sense in that language
          "Whoa, howd youw howses! Wait fow the command to finish befowe wunning it again",
        COMMAND_ERROR_GENERIC: (id: string) =>
          `Something went wwong whiwe wunning ${id}`,
        HELLO_PREFIX: (prefix: string) =>
          `Hey! My pwefix hewe is \`${prefix}\` ow you can mention me >w<`,
        ERROR_ROLE_UNUSABLE:
          "This wowe cannot be used as it is eithew managed by an integwation ow highew than my top wowe",
        ERROR_NO_KSOFT:
          "Unabwe to use KSoft.Si API due to wack of authentication",
        NO_MODERATORS_SET: "Thewe awe no mowodewatows set in this guiwd.",
        MORE_INTEGRATIONS:
          "Want mowe integwations? Use the suggest command to suggest some! >w<",
        MEMBERS: "Membews",
        USERS: "Usews",
        REGION: "Wegion",
        STATUS: "Status",
        UUID: "UUID",
        REASON: "Weason",
        MENTION: "Mention",
        CREATED: "Cweated",
        CREATED_GUILD: "Cweated Guiwd",
        JOINED: "Joined",
        JOIN_POSITION: "Join Position",
        NICKNAME: "Nickname",
        ABOUT: "About",
        ROLES: "Wowes",
        NOTES: "Notes",
        TITLE: "Titwe",
        STATS: "Stats",
        GUILD: "Guiwd",
        GUILDS: "Guiwds",
        CHANNEL: "Channew",
        ATTACHMENT: "Attachment",
        VARIABLES: "Vawiabwes",
        SUBJECT: "Subject",
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
            "Add a membew/wowe as a mowodewatow. If not set, anone with the Manage Messages pewmission is considewed a Mowodewatow",
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
        AUTODECANCER_COMMAND_DESCRIPTION: `Toggwe wenaming those with "cancewous" (non-ascii) names`,
        AUTODECANCER_ENABLED: `Enabwed autodecancew. **New** usews with "cancewous" (non-ascii) names wiww be wenamed`,
        AUTODECANCER_DISABLED: `Disabwed autodecancew. **New** usews with "cancewous" (non-ascii) names wiww no wongew be wenamed`,
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
            : `Output was too wong, faiwed to upwoad to hastebin`,
        GUILD_COMMAND_DESCRIPTION: "Get a genewaw ovewview of the guiwd",
        FILTER_INVITE_LOG_DESCRIPTION: (channel: string) =>
          `**Invite wink sent in** ${channel}`,
        FILTER_INVITE_LOG_CODE: "Invite Code",
        GUILD_CREATED_AT: (owner: string, created: string) =>
          `**Cweated by ${owner} ${created}**`,
        GOOGLE_COMMAND_DESCRIPTION: "Speak to the Googwe Assistant",
        GOOGLE_SOMETHING_WENT_WRONG:
          "<a:okaygoogle:769207087674032129> Something went wwong. Twy again watew",
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
        HELP_CREDITS_NAME: "Cwedits",
        HELP_CREDITS_VALUE: `
Fire uses wibwawies/sewvices made by [Ravy](https://ravy.pink/) & [The Aero Team](https://aero.bot/) incwuding
[@aero/sanitizer](https://www.npmjs.com/package/@aero/sanitizer)
[@aero/ksoft](https://www.npmjs.com/package/@aero/ksoft)
[Aether](https://git.farfrom.earth/aero/aether)
`,
        HELP_FOOTER: (prefix: string, cluster: number) =>
          `Use "${prefix}help <command>" fow mowe info about the command | Cwustew ID: ${cluster}`,
        SK1ER_NO_REUPLOAD: (user: string) =>
          `${user} I am unabwe to wead youw wog to wemove sensitive infowmation & pwovide sowutions to youw issue. Pwease upwoad the wog diwectwy :)`,
        SK1ER_REUPLOAD_FETCH_FAIL: (domain: string) =>
          `I was unabwe to wead youw wog. Pwease upwoad it diwectwy wathew than using ${domain}`,
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
          `${user} ${msgType} a wog${
            diff ? " fwom " + diff + " ago" : ""
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
        LYRICS_COMMAND_DESCRIPTION:
          'Get the wywics fow a song. (Fow best wesuwts, use the fowmat "awtist_name song_titwe")',
        LYRICS_NO_QUERY:
          'You need to pwovide a song to get the wywics fow. Fow best wesuwts, use the fowmat "awtist_name song_titwe"',
        LYRICS_NOT_FOUND: (error?: any) =>
          error && error == "Ewwow: No wesuwts"
            ? `I couwdn't find any wywics fow that song`
            : `An ewwow occuwwed whiwe twying to fetch wywics.`,
        LYRICS_TITLE: (title: string, artist: string) =>
          `${title} by ${artist}`,
        MAKEAMEME_COMMAND_DESCRIPTION:
          'Make youw own meme using the "top text bottom text" fowmat',
        MAKEAMEME_NO_IMAGE:
          "You need to pwovide an image url ow attach an image to make a meme",
        MAKEAMEME_NO_TEXT: "You must pwovide text sepawated by **|**",
        MAKEAMEME_UPLOAD_FAIL: "Faiwed to upwoad spicy meme :c",
        MEME_COMMAND_DESCRIPTION: "Get a wandom meme",
        MEME_NOT_FOUND: (error?: any) =>
          error && error == "Ewwow: subweddit not found"
            ? `I couwdn't find any memes. Hewe's an idea! Twy a subweddit that actuawwy exists next time ^w^`
            : `An ewwow occuwwed whiwe twying to fetch some spicy memes.`,
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
        MOD_INVALID: "You must pwovide a vawid mod",
        MODCORE_COMMAND_DESCRIPTION: "Get a pwayew's modcowe pwofiwe",
        MODCORE_INVALID_IGN:
          "You must pwovide a vawid IGN to get the ModCowe pwofiwe of",
        MODCORE_PROFILE_FETCH_FAIL: "Faiwed to fetch that pwayew's pwofiwe",
        MODCORE_PROFILE_TITLE: (player: string) =>
          `${player}'s ModCowe Pwofiwe`,
        MODCORE_ENABLED_COSMETICS: "Enabwed Cosmetics",
        MODCORE_NO_COSMETICS: "No Cosmetics",
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
          "You can find Fire's souwce code at <https://github.com/FireDiscordBot/bot/tree/rewrite/typescript>",
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
          VIEW_AUDIT_LOG: "View Audit Wog",
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
          `Authow ID: ${user} | Channew ID: ${channel}"`,
        PURGED_MESSAGES: "Puwged Messages",
        PURGED_MESSAGES_FAILED: "Faiwed to upwoad messages to hastebin",
        RANK_COMMAND_DESCRIPTION:
          "Wist aww avaiwabwe wanks and join a wank if pwovided",
        RANKS_NONE_FOUND: "Seems wike thewe's no wanks set fow this guiwd",
        RANKS_INFO: (role: string, members: string) =>
          `> ${role} (${members} membews)`,
        RANKS_AUTHOR: (guild: string) => `${guild}'s wanks`,
        RANKS_JOIN_REASON: "Joined wank",
        RANKS_JOIN_RANK: (role: string) =>
          `You successfuwwy joined the **${role}** wank.`,
        RANKS_LEAVE_REASON: "Weft wank",
        RANKS_LEFT_RANK: (role: string) =>
          `You successfuwwy weft the **${role}** wank.`,
        RANKS_INVALID_ROLE:
          "That isn't a vawid wank. Use the command without awguments to see a wist of vawid wanks",
        RANKS_INVALID_ROLE_DEL:
          "That isn't a vawid wank. Use the wank command to see a wist of vawid wanks",
        RANKS_SK1ER_NO_SPECS: (mention: string) =>
          `${mention} To become a beta testew, pwease pwovide youw specs thwough this fowm: 
<https://inv.wtf/sk1spec>
                
Once you get the wowe, head uvw to <#595634170336641045> and check the pinnyed messages fow the watest betas.`,
        ADDRANK_COMMAND_DESCRIPTION:
          "Add a role that users can join through the rank command.",
        RANKS_ALREADY_ADDED: "You can't add a rank twice silly",
        DELRANK_COMMAND_DESCRIPTION:
          "Remove a rank from the list of joinable roles.",
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
        SPECS_COMMAND_DESCRIPTION:
          "View/wemove a usews specs (wocked to discord.gg/sk1er)",
        SPECS_NOT_FOUND:
          "Specs not found fow that usew. Teww them to fiww in this fowm\n<https://inv.wtf/sk1spec>",
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
          "If you'we going to twy and steaw an emoji, at weast make it a vawid one...\nOthewwise it's a waste of time and you'ww wikewy get caught ¯\\_(ツ)_/¯",
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
          `Thewe doesn't seem to be a tag cawwed ${tag}. Wun the command again with no awguments to see aww tags`,
        TAGS_RAW_MISSING_ARG:
          "You need to pwovide a tag name to get the waw content of",
        TAGS_DELETE_MISSING_ARG:
          "Weww, I can't weawwy dewete nothing can I? Pwovide a tag name to dewete",
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
        TAGS_EDIT_MISSING_CONTENT:
          "You need to pwovide the new content fow the tag",
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
          `Ticket cweated by ${author} (${id}) with subject "${subject}"`,
        TICKET_OPENER_TILE: (author: string) => `Ticket opened by ${author}`,
        NEW_COMMAND_DESCRIPTION: "Makes a new ticket",
        NEW_TICKET_CREATING: "Cweating youw ticket...",
        NEW_TICKET_CREATED: (channel: string) =>
          `Successfuwwy made youw ticket, ${channel}`,
        NEW_TICKET_DISABLED: "Tickets awe not enabwed hewe",
        NEW_TICKET_LIMIT: "You have too many tickets open!",
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
      },
      enabled: true,
    });
  }
}
