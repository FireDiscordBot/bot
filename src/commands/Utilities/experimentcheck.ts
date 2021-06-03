import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { murmur3 } from "murmurhash-js";

type ExperimentID =
  | "2021-04_product_rebrand"
  | "2020-11_expression_suggestions"
  | "2021-02_mobile_expression_suggestions"
  | "2021-05_premium_increased_content_length"
  | "2021-05_stage_public_toggle_users"
  | "2021-04_stage_discovery"
  | "2021-03_mobile_web_scroll_experiment"
  | "2021-05_per_guild_avatars"
  | "2021-05_custom_profiles_premium"
  | "2021-04_premium_increased_max_guilds"
  | "2021-05_application_command_callout"
  | "2021-05_application_command_suggestions"
  | "2021-04_friend_nicknames";

const experiments = [
  "2021-04_product_rebrand",
  "2020-11_expression_suggestions",
  "2021-02_mobile_expression_suggestions",
  "2021-05_premium_increased_content_length",
  "2021-05_stage_public_toggle_users",
  "2021-04_stage_discovery",
  "2021-03_mobile_web_scroll_experiment",
  "2021-05_per_guild_avatars",
  "2021-05_custom_profiles_premium",
  "2021-04_premium_increased_max_guilds",
  "2021-05_application_command_callout",
  "2021-05_application_command_suggestions",
  "2021-04_friend_nicknames",
];

export default class ExperimentCheck extends Command {
  constructor() {
    super("experimentcheck", {
      description: (language: Language) =>
        language.get("EXPERIMENTCHECK_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "experiment",
          type: experiments,
          slashCommandOptions: experiments,
          readableType: "experiment id",
          slashCommandType: "type",
          required: true,
          default: null,
        },
        {
          id: "user",
          type: "user",
          required: true,
          default: null,
        },
      ],
      guilds: ["342506939340685312"],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  async exec(
    message: FireMessage,
    args: { experiment: ExperimentID; user: FireUser }
  ) {
    if (!args.user) return;
    const position = murmur3(`${args.experiment}:${args.user.id}`) % 1e4;
    return await message.send(
      "EXPERIMENTCHECK_POSITION",
      args.user.toString(),
      args.experiment,
      position
    );
  }
}
