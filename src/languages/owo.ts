import { TextChannel, GuildMember, User } from "discord.js";
import { FireGuild } from "../../lib/extensions/guild";
import { constants } from "../../lib/util/constants";
import { Language } from "../../lib/util/language";

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
        COMMAND_ERROR_GENERIC: (id: string) =>
          `Something went wwong whiwe wunnying ${id}`,
        NO_MODERATORS_SET: "Thewe awe nyo modewatows set in this guiwd.",
        MORE_INTEGRATIONS:
          "Want mowe integwations? Use the suggest command to suggest some!",
        MEMBERS: "Membews",
        REGION: "Wegion",
        STATUS: "Status",
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
          ENABLED_DISCOVERABLE_BEFORE: "Enyabwed Discuvwabwe Befowe",
          WELCOME_SCREEN_ENABLED: "Wewcome Scween",
          ANIMATED_ICON: "Anyimated Icon",
          INVITE_SPLASH: "Invite Spwash",
          DISCOVERABLE: "[Discuvwabwe](https://discord.com/guild-discovery)",
          MORE_EMOJI: "Mowe Emoji",
          FEATURABLE: "Featuwabwe",
          VANITY_URL: "Vanyity URL",
          COMMUNITY: "[Communyity](https://dis.gd/communityservers)",
          PARTNERED: "[Pawtnyewed](https://dis.gd/partners)",
          COMMERCE: "[Stowe Channyews](https://dis.gd/sellyourgame)",
          VERIFIED: "[Vewified](https://dis.gd/vfs)",
          BANNER: "Bannyew",
          NEWS:
            "[Annyouncement Channyews](https://support.discord.com/hc/en-us/articles/360032008192)",
          // CUSTOM FEATURES
          PREMIUM:
            "<:firelogo:665339492072292363> [Pwemium](https://gaminggeek.dev/premium)",
          ADDMOD_COMMAND_DESCRIPTION:
            "Add a membew/wowe as a modewatow. If nyot set, anyonye with the Manyage Messages pewmission is considewed a modewatow",
          MODERATORS_ROLES: "Modewatow Wowes",
          NO_MODERATOR_ROLES: "Nyo wowes have been set as modewatows.",
          MODERATORS_MEMBERS: "Modewatow Membews",
          NO_MODERATOR_MEMBERS: "Nyo membews have been set as modewatows.",
          MODERATORS_REMOVE_INVALID: "Invawid Modewatows",
          MODERATORS_REMOVED: (invalid: string[]) =>
            `I have wemuvd some modewatows as a matching wowe/membew couwd nyot be found...\nThe wemuvd ids awe: ${invalid.join(
              ", "
            )}`,
        },
        AUTODECANCER_COMMAND_DESCRIPTION: `Toggwe wenyaming those with "cancewous" (nyon-ascii) nyames`,
        AUTODECANCER_ENABLED: `Enyabwed autodecancew. **Nyew** usews with "cancewous" (nyon-ascii) nyames wiww be wenyamed`,
        AUTODECANCER_DISABLED: `Disabwed autodecancew. **Nyew** usews with "cancewous" (nyon-ascii) nyames wiww nyo wongew be wenyamed`,
        AUTODEHOIST_COMMAND_DESCRIPTION:
          "Toggwe wenyaming those with hoisted nyames",
        AUTODEHOIST_ENABLED:
          "Enyabwed autodehoist. **Nyew** usews with hoisted nyames wiww be wenyamed",
        AUTODEHOIST_DISABLED:
          "Disabwed autodehoist. **Nyew** usews with hoisted nyames wiww nyo wongew be wenyamed",
        AVATAR_COMMAND_DESCRIPTION: "Get a usew's avataw",
        BADNAME_COMMAND_DESCRIPTION:
          "Change the nyame used fow auto dehoist/decancew",
        BADNAME_NO_CHANGES: `I did absowutewy nyothing because that's awweady set as the "bad nyame"`,
        BADNAME_SET: (name: string) =>
          `I have set the "bad nyame" to ${name}. This wiww **nyot** wenyame existing usews`,
        BADNAME_RESET: `I have weset the "bad nyame" to John Doe 0000 (with 0000 being theiw discwiminyatow).
This wiww **nyot** wenyame existing usews`,
        DEBUG_COMMAND_DESCRIPTION:
          "Command nyot wowking? Use this command to twy debug the issue.\nDebug command nyot wowking? Join the Fiwe Suppowt sewvew, https://inv.wtf/fire",
        DEBUG_NO_COMMAND: "You must pwovide a vawid command to debug",
        DEBUGGING_DEBUG: "Debug command is wowking",
        DEBUG_PERMS_PASS: "Nyo pewmissions missing",
        DEBUG_PERMS_CHECKS_FAIL: "Pewmission Checks Faiwed!",
        DEBUG_PERMS_FAIL: (userMissing: string[], clientMissing: string[]) => {
          return {
            user: userMissing.length
              ? `You awe missing the pewmission${
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
        DSTATUS_COMMAND_DESCRIPTION: "Get Discowd's cuwwent status",
        DSTATUS_FETCH_FAIL: "Faiwed to fetch Discowd status",
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
        GUILD_COMMAND_DESCRIPTION: "Get a genyewaw uvwview of the guiwd",
        GUILD_CREATED_AT: (guild: FireGuild, created: string) =>
          `**Cweated by ${
            guild.owner.user.username + guild.owner.user.discriminator ||
            "Unknyown#0000"
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
        SK1ER_NO_REUPLOAD: (user: GuildMember | User) =>
          `${user} I am unyabwe to wead youw wog to wemuv sensitive infowmation & pwovide sowutions to youw issue. Pwease upwoad the wog diwectwy :)`,
        SK1ER_REUPLOAD_FETCH_FAIL: (domain: string) =>
          `I was unyabwe to wead youw wog. Pwease upwoad it diwectwy wathew than using ${domain}`,
        SK1ER_LOG_READ_FAIL:
          "I was unyabwe to wead the attachment, twy weupwoad it. If it stiww doesn't wowk, yeww at Geek :)",
        SK1ER_MODCORE_ZIP: (user: GuildMember | User) =>
          `${user}, Unzip this in \`.minecraft/modcore\` and youw issue shouwd be wesowved.`,
        SK1ER_LOG_HASTE: (
          user: GuildMember | User,
          msgType: string,
          extra: string,
          haste: string,
          solutions: string
        ) => `${user} ${msgType} a wog, ${extra}\n${haste}\n\n${solutions}`,
        INVITE_COMMAND_DESCRIPTION:
          "Sends a wink to invite me to a diffewent Discowd sewvew.",
        LANGUAGE_COMMAND_DESCRIPTION:
          "Set the wanguage Fiwe uses. You can add/impwuv wanguages on the GitHub wepo, https://inv.wtf/github",
        LANGUAGE_COMMAND_CURRENT: (
          language: string // should always say it in the current language
        ) =>
          `The cuwwent wanguage is ${language}. You can set the wanguage to any of the fowwowing...\n${this.client.languages.modules
            .keyArray()
            .join(
              ", "
            )}\n\nNyote: Some wanguages may be unfinyished so sometimes you'ww see some Engwish if the stwing hasn't been twanswated`,
        LANGUAGE_COMMAND_HELLO:
          "Hewwo >w<  You have successfuwwy set Fiwe's wanguage to OwO :D",
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
          "Set channyews to westwict commands fow modewatows",
        MODONLY_NO_CHANNELS:
          "You must pwovide vawid channyew(s) sepawated by a comma ow space fow me to toggwe modewatow onwy mode in.",
        MODONLY_SET: (channels: string) =>
          `Commands can nyow onwy be wun by modewatows (eithew those set as mods ow those with manyage messages) in;\n${channels}.`,
        MODONLY_RESET: "Modewatow onwy channyews have been weset",
        ADMINONLY_COMMAND_DESCRIPTION:
          "Set channyews to westwict commands fow admins",
        ADMINONLY_NO_CHANNELS:
          "You must pwovide vawid channyew(s) sepawated by a comma ow space fow me to toggwe admin onwy mode in.",
        ADMINONLY_SET: (channels: string) =>
          `Commands can nyow onwy be wun by those with the "Manyage Sewvew" pewmission in;\n${channels}.`,
        ADMINONLY_RESET: "Admin onwy channyews have been weset",
        PING_COMMAND_DESCRIPTION: "Shows you my ping to discowd's sewvews",
        PING_INITIAL_MESSAGE: "Pinging...",
        PING_FINAL_MESSAGE: "Pong!",
        PLONK_COMMAND_DESCRIPTION:
          "Make a usew unyabwe to use the best discowd bot",
      },
      enabled: true,
    });
  }
}
