import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { userMemberSnowflakeTypeCaster } from "@fire/src/arguments/userMemberSnowflake";
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
      slashOnly: true,
    });
  }

  async run(command: ApplicationCommandMessage, args: { snowflake: string }) {
    if (!args.snowflake) return;
    const snowflake = await userMemberSnowflakeTypeCaster(
      command,
      args.snowflake
    );
    if (!this.userCommand)
      this.userCommand = this.client.getCommand("user") as User;
    if (!this.userCommand || !snowflake) return;
    return await this.userCommand.snowflakeInfo(
      command,
      // @ts-ignore (i can't figure out why this complains)
      snowflake
    );
  }
}
