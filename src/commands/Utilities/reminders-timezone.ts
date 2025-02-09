import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import * as dayjs from "dayjs";
import {
  ApplicationCommandOptionChoiceData,
  CacheType,
  CommandInteractionOption,
} from "discord.js";

const defaults: ApplicationCommandOptionChoiceData[] = [
  { name: "UTC-8 - Pacific Standard Time (PST)", value: "America/Los_Angeles" },
  { name: "UTC-7 - Mountain Standard Time (MST)", value: "America/Denver" },
  { name: "UTC-6 - Central Standard Time (CST)", value: "America/Chicago" },
  { name: "UTC-5 - Eastern Standard Time (EST)", value: "America/New_York" },
  { name: "UTC-4 - Atlantic Standard Time (AST)", value: "America/Halifax" },
  { name: "UTC+0 - Greenwich Mean Time (GMT)", value: "Etc/GMT" },
  {
    name: "UTC+0 - British Isles / Western European Time (GMT/WET)",
    value: "Europe/Dublin", // ireland pogger
  },
  { name: "UTC+1 - Central European Time (CET)", value: "Europe/Paris" },
  { name: "UTC+5:30 - India Standard Time (IST)", value: "Asia/Kolkata" },
  { name: "UTC+8 - China Standard Time (CST)", value: "Asia/Shanghai" },
  { name: "UTC+8 - Japan Standard Time (JST)", value: "Asia/Tokyo" },
  {
    name: "UTC+10 - Australian Eastern Standard Time (AEST)",
    value: "Australia/Sydney",
  },
  {
    name: "UTC+11 - Melbourne Standard Time (MST)",
    value: "Australia/Melbourne",
  },
  {
    name: "UTC+12 - New Zealand Standard Time (NZST)",
    value: "Pacific/Auckland",
  },
];

const extended: ApplicationCommandOptionChoiceData[] = [
  { name: "UTC-11 - Samoa Standard Time (SST)", value: "Pacific/Apia" },
  {
    name: "UTC-10 - Hawaii-Aleutian Standard Time, with daylight savings (HST)",
    value: "America/Adak",
  },
  {
    name: "UTC-10 - Hawaii-Aleutian Standard Time, without daylight savings (HST)",
    value: "Pacific/Honolulu",
  },
  { name: "UTC-9 - Alaska Standard Time (AKST)", value: "America/Anchorage" },
  { name: "UTC-8 - Pacific Standard Time (PST)", value: "America/Los_Angeles" },
  { name: "UTC-7 - Mountain Standard Time (MST)", value: "America/Denver" },
  { name: "UTC-6 - Central Standard Time (CST)", value: "America/Chicago" },
  { name: "UTC-5 - Eastern Standard Time (EST)", value: "America/New_York" },
  { name: "UTC-5 - Acre Time (ACT)", value: "America/Rio_Branco" },
  { name: "UTC-4 - Atlantic Standard Time (AST)", value: "America/Halifax" },
  { name: "UTC-4 - Amazonas Time (AMT)", value: "America/Manaus" },
  {
    name: "UTC-3:30 - Newfoundland Standard Time (NST)",
    value: "America/St_Johns",
  },
  {
    name: "UTC-3 - Argentina Time (ART)",
    value: "America/Argentina/Buenos_Aires",
  },
  { name: "UTC-3 - Brasilia Time (BRT)", value: "America/Sao_Paulo" },
  { name: "UTC-2 - South Georgia Time (GST)", value: "Atlantic/South_Georgia" },
  { name: "UTC-2 - Fernando de Noronha Time (FNT)", value: "America/Noronha" },
  { name: "UTC-1 - Azores Standard Time (AZOST)", value: "Atlantic/Azores" },
  { name: "UTC+0 - Greenwich Mean Time (GMT)", value: "Etc/GMT" },
  {
    name: "UTC+0 - British Isles / Western European Time (GMT/WET)",
    value: "Europe/Dublin", // ireland pogger
  },
  {
    name: "UTC+1 - Central European Time, with daylight savings (CET)",
    value: "Europe/Paris",
  },
  {
    name: "UTC+1 - Central European Time, without daylight savings (CET)",
    value: "CET",
  },
  { name: "UTC+1 - West Africa Time (WAT)", value: "Africa/Lagos" },
  { name: "UTC+2 - Eastern European Time (EET)", value: "Europe/Bucharest" },
  {
    name: "UTC+2 - South African Standard Time (SAST)",
    value: "Africa/Johannesburg",
  },
  {
    name: "UTC+2 - Central Africa Time (CAT)",
    value: "Africa/Maputo",
  },
  { name: "UTC+3 - East Africa Time (EAT)", value: "Africa/Nairobi" },
  { name: "UTC+3 - Moscow Time (MSK)", value: "Europe/Moscow" },
  { name: "UTC+3:30 - Iran Standard Time (IRST)", value: "Asia/Tehran" },
  { name: "UTC+4 - Gulf Standard Time (GST)", value: "Asia/Dubai" },
  { name: "UTC+4:30 - Afghanistan Time (AFT)", value: "Asia/Kabul" },
  { name: "UTC+5 - Pakistan Standard Time (PKT)", value: "Asia/Karachi" },
  { name: "UTC+5:30 - India Standard Time (IST)", value: "Asia/Kolkata" },
  { name: "UTC+5:45 - Nepal Time (NPT)", value: "Asia/Kathmandu" },
  { name: "UTC+6 - Bangladesh Standard Time (BST)", value: "Asia/Dhaka" },
  { name: "UTC+6:30 - Myanmar Time (MMT)", value: "Asia/Yangon" },
  { name: "UTC+7 - Indochina Time (ICT)", value: "Asia/Bangkok" },
  { name: "UTC+8 - China Standard Time (CST)", value: "Asia/Shanghai" },
  {
    name: "UTC+8:45 - Central Western Standard Time (CWST)",
    value: "Australia/Eucla",
  },
  { name: "UTC+9 - Japan Standard Time (JST)", value: "Asia/Tokyo" },
  {
    name: "UTC+9:30 - Australian Central Standard Time (ACST)",
    value: "Australia/Darwin",
  },
  {
    name: "UTC+10 - Australian Eastern Standard Time (AEST)",
    value: "Australia/Sydney",
  },
  {
    name: "UTC+10:30 - Lord Howe Standard Time (LHST)",
    value: "Australia/Lord_Howe",
  },
  { name: "UTC+11 - Solomon Islands Time (SBT)", value: "Pacific/Guadalcanal" },
  { name: "UTC+11:30 - Norfolk Island Time (NFT)", value: "Pacific/Norfolk" },
  {
    name: "UTC+12 - New Zealand Standard Time (NZST)",
    value: "Pacific/Auckland",
  },
  {
    name: "UTC+12:45 - Chatham Standard Time (CHAST)",
    value: "Pacific/Chatham",
  },
  { name: "UTC+13 - Tonga Standard Time (TOT)", value: "Pacific/Tongatapu" },
  { name: "UTC+14 - Line Islands Time (LINT)", value: "Pacific/Kiritimati" },
];

export default class RemindersTimezone extends Command {
  constructor() {
    super("reminders-timezone", {
      description: (language: Language) =>
        language.get("REMINDERS_TIMEZONE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "timezone",
          type: "string",
          description: (language: Language) =>
            language.get("REMINDERS_TIMEZONE_ARGUMENT_TIMEZONE_DESCRIPTION"),
          autocomplete: true,
          required: true,
          default: "Etc/UTC",
        },
      ],
      enableSlashCommand: true,
      parent: "reminders",
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async autocomplete(
    _: ApplicationCommandMessage,
    focused: CommandInteractionOption<CacheType>
  ): Promise<ApplicationCommandOptionChoiceData[]> {
    if (!focused.value) return defaults;
    else
      return extended
        .filter(
          (v) =>
            v.name
              .toLowerCase()
              .includes(focused.value.toString().toLowerCase()) ||
            v.value.toString().toLowerCase() ==
              focused.value.toString().toLowerCase()
        )
        .slice(0, 25);
  }

  async run(command: ApplicationCommandMessage, args: { timezone: string }) {
    if (
      !extended.find(
        (d) => d.value.toString().toLowerCase() == args.timezone.toLowerCase()
      )
    )
      return await command.error("REMINDERS_TIMEZONE_IANA_UNKNOWN");
    const updatedTz = await command.author.settings.set(
      "reminders.timezone.iana",
      args.timezone
    );
    if (!updatedTz)
      return await command.error("REMINDERS_TIMEZONE_UPDATE_FAILED");
    const timezone = dayjs.tz(dayjs(), args.timezone);
    const time = (timezone["$d"] as Date).toLocaleTimeString(timezone.locale());
    const date = (timezone["$d"] as Date).toLocaleDateString(timezone.locale());
    await command.success("REMINDERS_TIMEZONE_SET_IANA", {
      timezone: args.timezone,
      time: `${date} at ${time}`,
    });
  }
}
