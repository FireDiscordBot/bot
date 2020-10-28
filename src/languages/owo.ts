import { FireMember } from "../../lib/extensions/guildmember";
import { FireGuild } from "../../lib/extensions/guild";
import { FireUser } from "../../lib/extensions/user";
import { constants } from "../../lib/util/constants";
import { Language } from "../../lib/util/language";
import { TextChannel } from "discord.js";
import { Ban } from "@aero/ksoft";

export default class owo extends Language {
  constructor() {
    super("owo", {
      language: {
        DEFAULT: (key: string) => `${key} has nyot been wocawized fow owo yet.`,
        USER_NOT_FOUND: "Usew nyot found! Twy use an ID instead.",
        MEMBER_NOT_FOUND: "Membew nyot found! Twy use an ID instead.",
        CHANNEL_NOT_FOUND: "Channyew nyot found! Twy use an ID instead.",
        ROLE_NOT_FOUND: "Wowe nyot found! Twy use an ID instead.",
        INVALID_USER_ID: "Usew nyot found! Make suwe the ID is vawid.",
        INVALID_MEMBER_ID: "Channyew nyot found! Twy use an ID instead.",
        INVALID_CHANNEL_ID: "Channyew nyot found! Make suwe the ID is vawid.",
        INVALID_ROLE_ID: "Wowe nyot found! Make suwe the ID is vawid.",
        INVALID_MESSAGE:
          "Message nyot found! Make suwe you'we giving a vawid id/wink.",
        UNKNOWN_COMMAND: "Command nyot found",
        COMMAND_OWNER_ONLY: "Onwy my ownyew can use this command",
        // invite will be changed when deployed to main bot
        COMMAND_GUILD_ONLY:
          "You can onwy use this command in a sewvew. You can invite me to a sewvew at <https://inv.wtf/tsbot>",
        COMMAND_PREMIUM_ONLY:
          "Onwy pwemium guiwds can use this command. Weawn mowe at https://inv.wtf/premium",
        COMMAND_ERROR_GENERIC: (id: string) =>
          `Something went wwong whiwe wunnying ${id}`,
        NO_MODERATORS_SET: "Thewe awe nyo mowodewatows set in this guiwd.",
        MORE_INTEGRATIONS:
          "Want mowe integwations? Use the suggest command to suggest some! >w<",
        MEMBERS: "Membews",
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
        REGION_DEPRECATED: "❓ Depwecated Wegion",
        REGIONS: {
          brazil: "🇧🇷 Bwaziw",
          europe: "🇪🇺 Euwope",
          hongkong: "🇭🇰 Hong Kong",
          india: "🇮🇳 India",
          japan: "🇯🇵 Japan",
          russia: "🇷🇺 Wussia",
          singapore: "🇸🇬 Singapowe",
          southafrica: "🇿🇦 Singapowe",
          sydney: "🇦🇺 Sydnyey",
          "us-central": "🇺🇸 Centwaw US",
          "us-south": "🇺🇸 US South",
          "us-east": "🇺🇸 US East",
          "us-west": "🇺🇸 US West",
        },
        FEATURES: {
          ENABLED_DISCOVERABLE_BEFORE: "Enyabwed Discuwuvwabwe Befowe",
          WELCOME_SCREEN_ENABLED: "Wewcome Scween",
          ANIMATED_ICON: "Anyimated Icon",
          INVITE_SPLASH: "Invite Spwash",
          DISCOVERABLE: "[Discuvwabwe](https://discord.com/guild-discovery)",
          MORE_EMOJI: "Mowe Emoji",
          FEATURABLE: "Featuwuabwe",
          VANITY_URL: "Vanyity URL",
          COMMUNITY: "[Commuwunity](https://dis.gd/communityservers)",
          PARTNERED: "[Pawtnyewed](https://dis.gd/partners)",
          COMMERCE: "[Stowe Channyews](https://dis.gd/sellyourgame)",
          VERIFIED: "[Vewified](https://dis.gd/vfs)",
          BANNER: "Bannyew",
          NEWS:
            "[Annowouncement Channyews](https://support.discord.com/hc/en-us/articles/360032008192)",
          // CUSTOM FEATUWUES
          PREMIUM:
            "<:firelogo:665339492072292363> [Pwemiuwum](https://gaminggeek.dev/premium)",
          ADDMOD_COMMAND_DESCRIPTION:
            "Add a membew/wowe as a mowodewatow. If nyot set, anyone with the Manyage Messages pewmission is considewed a Mowodewatow",
          MODERATORS_ROLES: "Mowodewatow Wowes",
          NO_MODERATOR_ROLES: "Nyo wowes have been set as mowodewatows.",
          MODERATORS_MEMBERS: "Mowodewatow Membews",
          NO_MODERATOR_MEMBERS: "Nyo membews have been set as mowodewatows.",
          MODERATORS_REMOVE_INVALID: "Invawid Mowodewatows",
          MODERATORS_REMOVED: (invalid: string[]) =>
            `I have wemuvd some mowodewatows as a matching wowe/membew couwd nyot be found...\nThe wemuvd ids awe: ${invalid.join(
              ", "
            )}`,
        },
        AUTODECANCER_COMMAND_DESCRIPTION: `Toggwe wenyaming those with "cancewous" (nyon-ascii) nyames`,
        AUTODECANCER_ENABLED: `Enyabwed autodecancew. **Nyew** usews with "cancewous" (nyon-ascii) nyames wiww be wenyamed`,
        AUTODECANCER_DISABLED: `Disabwed autodecancew. **Nyew** usews with "cancewous" (nyon-ascii) nyames wiww nyo wongew be wenyamed`,
        AUTODEHOIST_COMMAND_DESCRIPTION:
          "Toggwe wenyaming those with howoisted nyames",
        AUTODEHOIST_ENABLED:
          "Enyabwed autodehoist. **Nyew** usews with howoisted nyames wiww be wenyamed",
        AUTODEHOIST_DISABLED:
          "Disabwed autodehoist. **Nyew** usews with howoisted nyames wiww nyo wongew be wenyamed",
        AVATAR_COMMAND_DESCRIPTION: "Get a usew's avataw",
        BADNAME_COMMAND_DESCRIPTION:
          "Change the nyame used fow auto dehoist/decancew",
        BADNAME_NO_CHANGES: `I did absowutewy nyothing because that's awweady set as the "bad nyame"`,
        BADNAME_SET: (name: string) =>
          `I have set the "bad nyame" to ${name}. This wiww **nyot** wenyame existing usews`,
        BADNAME_RESET: `I have weset the "bad nyame" to John Doe 0000 (with 0000 being theiw discwiminyatow).
This wiww **nyot** wenyame existing usews`,
        DEBUG_COMMAND_DESCRIPTION:
          "Command nyot wowking? Use this command to twy debug the issue.\nDebug command nyot wowking? Join the Fire Suppowt sewvew, https://inv.wtf/fire",
        DEBUG_NO_COMMAND: "You must pwovide a vawid command to debug",
        DEBUGGING_DEBUG: "Debug command is wowking",
        DEBUG_PERMS_PASS: "Nyo pewmissiowons missing",
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
        DEBUG_COMMAND_NOT_DISABLED: "Command is nyot disabwed",
        DEBUG_MUTE_BYPASS: (channel: TextChannel, bypass: string[]) =>
          `The fowwowing usews/wowes wiww bypass mutes in ${channel}\n${bypass.join(
            ", "
          )}`,
        DEBUG_MUTE_NO_BYPASS: (channel: TextChannel) =>
          `Nyobody can bypass mutes in ${channel}`,
        DEBUG_NO_EMBEDS: "I cannyot send embeds",
        DEBUG_ISSUES: (issues: string[]) =>
          issues.length ? `${issues.length} issues found` : "Nyo issues found",
        DESC_COMMAND_DESCRIPTION:
          "Set the descwiption fow the sewvew that shows in Vanyity URLs",
        DESC_NO_VANITY: (prefix: string) =>
          `You must set a vanyity url with \`${prefix}vanityurl\` befowe you can set a descwiption`,
        DESC_FAILED: "Faiwed to set guiwd descwiption.",
        DESC_SET: "Successfuwwy set guiwd descwiption!",
        DESC_RESET: "Successfuwwy weset guiwd descwiption!",
        DISCOVER_COMMAND_DESCRIPTION: "Links to Fire's pubwic sewvews page",
        DISCOVER_MESSAGE: `You can find Fire\'s pubwic sewvew wist at <${constants.url.discovery}>
Hint: Use the \`public\` command to get youw sewvew on the wist`,
        STATUS_LATEST_INCIDENT: "Watest Incident",
        STATUSPAGE_PAGE_DESCRIPTIONS: {
          "all systems operational": "All Systems Opewationyaw",
          "partially degraded service": "Pawtiawwy Degwaded Sewvice",
          "minor service outage": "Minyow Sewvice Outage",
          "partial system outage": "Pawtiaw System Outage",
          "service under maintenance": "Sewvice Undew Maintenyance",
        },
        STATUSPAGE_INCIDENT_STATUS: {
          investigating: "Investigating",
          identified: "Identified",
          monitoring: "Monyitowing",
          resolved: "Wesowved",
          scheduled: "Scheduwed",
          "in progress": "In Pwogwess",
          verifying: "Vewifying",
          completed: "Compweted",
          postmortem: "Postmowtem",
        },
        STATUSPAGE_COMPONENT_STATUS: {
          operational: "Opewationyaw",
          degraded_performance: "Degwaded Pewmowmance",
          partial_outage: "Pawtiaw Outage",
          major_outage: "Majow Outage",
          under_maintenance: "Undew Maintenyance",
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
            "Yes - definyitewy.",
            "You may wewy on it.",
            "As I see it, yes.",
            "Most wikewy.",
            "Outwook good.",
            "Yes.",
            "Signs point to yes.",
            "Wepwy hazy, twy again.",
            "Ask again watew.",
            "Bettew nyot teww you nyow.",
            "Cannyot pwedict nyow.",
            "Concentwate and ask again.",
            "Don't count on it.",
            "My wepwy is nyo.",
            "My souwces say nyo.",
            "Outwook nyot so good.",
            "Vewy doubtfuw.",
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        },
        EVAL_COMMAND_DESCRIPTION: "wun epic gamew code",
        EVAL_TOO_LONG: (haste?: string) =>
          haste
            ? `Output was too wong, upwoaded to hastebin; ${haste}`
            : `Output was too wong, faiwed to upwoad to hastebin`,
        GUILD_COMMAND_DESCRIPTION: "Get a genyewaw uvwview of the guiwd",
        GUILD_CREATED_AT: (guild: FireGuild, created: string) =>
          `**Cweated by ${
            guild.owner.user.discriminator != null
              ? guild.owner
              : "Unknyown#0000"
          } ${created}**`,
        GUILD_JOIN_POS: (pos: number) => `**Youw Join Position:** ${pos}`,
        GUILD_VERIF_VERY_HIGH: "**Extweme Vewification Wevew**",
        GUILD_VERIF_HIGH: "**High Vewification Wevew**",
        GUILD_VERIF_MEDIUM: "**Medium Vewification Wevew**",
        GUILD_VERIF_LOW: "**Low Vewification Wevew**",
        GUILD_VERIF_NONE: "**Nyo Vewification!**",
        GUILD_FILTER_ALL: "**Content Fiwtew:** All Membews",
        GUILD_FILTER_NO_ROLE: "**Content Fiwtew:** Without Role",
        GUILD_FILTER_NONE: "**Content Fiwtew:** Disabwed",
        GUILD_NOTIFS_MENTIONS: "**Defauwt Nyotifications:** Onwy @Mentions",
        GUILD_NOTIFS_ALL: "**Defauwt Nyotifications:** All Messages",
        GUILD_MFA_ENABLED: "**Two-Factow Auth:** Enyabwed",
        GUILD_MFA_NONE: "**Two-Factow Auth:** Disabwed",
        GUILD_ABOUT: "» About",
        GUILD_SECURITY: "» Secuwity",
        GUILD_FEATURES: "» Featuwes",
        GUILD_ROLES: "» Roles",
        HELP_COMMAND_DESCRIPTION:
          "Wists all of Fire's commands and pwovides infowmation about them",
        HELP_FOOTER: (prefix: string, cluster: number) =>
          `Use "${prefix}help <command>" fow mowe info about the command | Cwustew ID: ${cluster}`,
        SK1ER_NO_REUPLOAD: (user: FireMember | FireUser) =>
          `${user} I am unyabwe to wead youw wog to wemuv sensitive infowmation & pwovide sowutions to youw issue. Pwease upwoad the wog diwectwy :)`,
        SK1ER_REUPLOAD_FETCH_FAIL: (domain: string) =>
          `I was unyabwe to wead youw wog. Pwease upwoad it diwectwy wathew than using ${domain}`,
        SK1ER_LOG_READ_FAIL:
          "I was unyabwe to wead the attachment, twy weupwoad it. If it stiww doesn't wowk, yeww at Geek :)",
        SK1ER_MODCORE_ZIP: (user: FireMember | FireUser, zip: string) =>
          `${user}, Downwoad the zip fwom ${zip} and then unzip it in \`.minecraft/modcore\` and youw issue shouwd be wesowved.`,
        SK1ER_LOG_HASTE: (
          user: FireMember | FireUser,
          msgType: string,
          extra: string,
          haste: string,
          solutions: string
        ) => `${user} ${msgType} a wog, ${extra}\n${haste}\n\n${solutions}`,
        INVITE_COMMAND_DESCRIPTION:
          "Sends a wink to invite me to a diffewent Discowod sewvew.",
        LANGUAGE_COMMAND_DESCRIPTION:
          "Set the wanguage Fire uses. You can add/impwuve wanguages on the GitHub wepo, https://inv.wtf/github",
        LANGUAGE_COMMAND_CURRENT: (
          language: string // should always say it in the current language
        ) =>
          `The cuwwent wanguage is ${language}. You can set the wanguage to any of the fowwowing...\n${this.client.languages.modules
            .keyArray()
            .join(
              ", "
            )}\n\nNyote: Some wanguages may be unfinyished so sometimes you'ww see some Engwish if the stwing hasn't been twanswated`,
        LANGUAGE_COMMAND_HELLO: (type: "guild" | "user") =>
          type == "user"
            ? "Hewwo! You have successfuwwy set Fire's wanguage to OwO :D"
            : "Hewwo! You have successfuwwy set Fire's wanguage to OwO. Want to set it just fow you? Wun the command in DMs",
        LEVELHEAD_COMMAND_DESCRIPTION: "Get a pwayew's wevewhead info",
        LEVELHEAD_NO_PLAYER:
          "You nyeed to give a pwayew fow me to check the wevewhead of",
        LEVELHEAD_FETCH_FAIL: "Faiwed to fetch wevewhead info",
        LEVELHEAD_MALFORMED_UUID:
          "Mawfowmed UUID. Check the spewwing of the pwayew's nyame",
        LEVELHEAD_PURCHASED: "Puwchased",
        LEVELHEAD_NOT_PURCHASED: "Nyot Puwchased",
        LEVELHEAD_EMBED_TITLE: (player: string) => `${player}'s Wevewhead`,
        LEVELHEAD_PROPOSED: "Pwoposed Wevewhead",
        LEVELHEAD_DENIED: "Denyied",
        LEVELHEAD_OTHER: "Othew Items",
        LEVELHEAD_TAB: "Tab",
        LEVELHEAD_CHAT: "Chat",
        LEVELHEAD_ADDON_LAYERS: "Addon Head Wayews",
        MODONLY_COMMAND_DESCRIPTION:
          "Set channyews to westwict commands fow mowodewatows",
        MODONLY_NO_CHANNELS:
          "You must pwovide vawid channyew(s) sepawated by a comma ow space fow me to toggwe mowodewatow onwy mode in.",
        MODONLY_SET: (channels: string) =>
          `Commands can nyow onwy be wun by mowodewatows (eithew those set as mods ow those with manyage messages) in;\n${channels}.`,
        MODONLY_RESET: "Mowodewatow onwy channyews have been weset",
        ADMINONLY_COMMAND_DESCRIPTION:
          "Set channyews to westwict commands fow admins",
        ADMINONLY_NO_CHANNELS:
          "You must pwovide vawid channyew(s) sepawated by a comma ow space fow me to toggwe admin onwy mode in.",
        ADMINONLY_SET: (channels: string) =>
          `Commands can nyow onwy be wun by those with the "Manyage Sewvew" pewmissiowon in;\n${channels}.`,
        ADMINONLY_RESET: "Admin onwy channyews have been weset",
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
        MCUUID_COMMAND_DESCRIPTION:
          "Get a pwayew's UUID (use --dashed to get the uuid with dashes)",
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
        OSS_COMMAND_DESCRIPTION: "Sends my GitHub wepo wink",
        OSS_MESSAGE:
          "You can find Fire's souwce code at <https://github.com/FireDiscordBot/bot/tree/rewrite/typescript>",
        KEY_PERMISSIONS: "Key Pewmissions",
        PERMISSIONS_TEXT: "Pewmissions",
        PERMISSIONS: {
          // If possible, use the translations from the Discord client here
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
            "Mention @\u200bevewyonye, @\u200bhewe and Aww Wowes",
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
          "Set youw sewvew to pubwic which awwows it to be visibwe on Fire's Pubwic Sewvews page (https://inv.wtf/discover)",
        PUBLIC_VANITY_BLACKLIST:
          "This guiwd has been bwackwisted fwom vanyity featuwes and thewefowe cannyot be pubwic!",
        PUBLIC_VANITY_REQUIRED: (prefix: string) =>
          `You must set a vanyity url with \`${prefix}vanityurl\` befowe youw guiwd can be pubwic`,
        PUBLIC_ENABLED: (vanity: string) =>
          `Youw guiwd is nyow pubwic & visibwe on <https://inv.wtf/discover>.
 Peopwe wiww be abwe to use youw guiwd's vanyity uww (<https://inv.wtf/${vanity}>) to join`,
        PUBLIC_ENABLED_LOG: (user: FireMember) =>
          `${constants.statuspage.emojis.operational} This sewvew was set to pubwic by ${user} and wiww appeaw on Fire\'s pubwic sewvew wist`,
        PUBLIC_DISABLED:
          "Youw guiwd is no wongew pubwic and wiww no wongew show on the Fire website",
        PUBLIC_DISABLED_LOG: (user: FireMember) =>
          `${constants.statuspage.emojis.major_outage} This sewvew was manuawwy wemuvd fwom Fire\'s pubwic sewvew wist by ${user}`,
        PLONK_COMMAND_DESCRIPTION:
          "Make a usew unyabwe to use the best Discowod bot",
        PURGE_COMMAND_DESCRIPTION:
          "Buwk dewete messages with optionaw fwags to sewectivewy dewete messages based on cewtain factows",
        PURGE_AMOUNT_INVALID: "Invawid amount. Minumum is 2, Maximum is 500",
        PURGE_HISTORY_FAIL: "Faiwed to fetch messages",
        PURGE_SUCCESS: (messages: number) =>
          `Successfuwwy deweted **${messages}** messages!`,
        PURGE_FAIL: "Faiwed to puwge messages...",
        PURGE_LOG_DESCRIPTION: (amount: number, channel: TextChannel) =>
          `**${amount} messages wewe puwged in ${channel}**`,
        PURGE_LOG_FOOTER: (user: FireUser, channel: TextChannel) =>
          `Authow ID: ${user.id} | Channew ID: ${channel.id}"`,
        PURGED_MESSAGES: "Puwged Messages",
        PURGED_MESSAGES_FAILED: "Faiwed to upwoad messages to hastebin",
        SKIN_COMMAND_DESCRIPTION: "See a pwayew's Minecwaft skin",
        SKIN_INVALID_IGN: "You must pwovide a vawid IGN to get the skin of",
        SLOWMODE_COMMAND_DESCRIPTION:
          "Set the swowmode fow a channew ow categowy",
        SLOWMODE_INVALID_TYPE: "You must pwovide a text channew ow categowy",
        SLOWMODE_FAILED: (channels: string[]) =>
          `Faiwed to set swowmode in ${channels.join(", ")}`,
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
        USER_KSOFT_BANNED: (ban: Ban) =>
          `Banned on [KSoft.Si](https://bans.ksoft.si/share?user=${ban.user.id}) fow ${ban.reason} - [Pwoof](${ban.proof})`,
        VOTE_COMMAND_DESCRIPTION:
          'Sends a wink to Fire on a wandom bot wist (sends diwect vote wink if you use the "vote" awias)',
        RELOAD_COMMAND_DESCRIPTION:
          "Wewoad a command/wanguage/wistenew/moduwe",
      },
      enabled: true,
    });
  }
}
