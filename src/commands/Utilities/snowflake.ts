import { FireMessage } from "@fire/lib/extensions/message";
import { DeconstructedSnowflake } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import User from "./user";

export default class Snowflake extends Command {
  userCommand: User;

  constructor() {
    super("snowflake", {
      description: (language: Language) =>
        language.get("SNOWFLAKE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "snowflake",
          type: "user|member|snowflake",
          description: (language: Language) =>
            language.get("SNOWFLAKE_ARGUMENT_DESCRIPTION"),
          required: true,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
    });
  }

  async exec(
    message: FireMessage,
    args: { snowflake: { snowflake: string } & DeconstructedSnowflake }
  ) {
    if (!this.userCommand)
      this.userCommand = this.client.getCommand("user") as User;
    if (!this.userCommand || !args.snowflake) return;
    let { snowflake } = args;
    return await this.userCommand.snowflakeInfo(message, snowflake);
  }
}
