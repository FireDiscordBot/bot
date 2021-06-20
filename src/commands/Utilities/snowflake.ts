import { userMemberSnowflakeTypeCaster } from "@fire/src/arguments/userMemberSnowflake";
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
          type: "string",
          description: (language: Language) =>
            language.get("SNOWFLAKE_ARGUMENT_DESCRIPTION"),
          readableType: "snowflake",
          required: true,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage, args: { snowflake: string }) {
    let { snowflake } = args;
    if (!snowflake) return;
    snowflake = await userMemberSnowflakeTypeCaster(message, snowflake);
    if (!this.userCommand)
      this.userCommand = this.client.getCommand("user") as User;
    if (!this.userCommand || !snowflake) return;
    return await this.userCommand.snowflakeInfo(
      message,
      // @ts-ignore (i can't figure out why this complains)
      snowflake
    );
  }
}
