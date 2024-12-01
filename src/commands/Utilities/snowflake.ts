import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { snowflakeConverter } from "@fire/lib/util/converters";
import { Language } from "@fire/lib/util/language";
import User from "./user";

const MAX_ACCEPTED_SNOWFLAKE = 9223372036854775807n;

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
    try {
      const theIntDoBeKindaBigDoe = BigInt(args.snowflake);
      if (theIntDoBeKindaBigDoe > MAX_ACCEPTED_SNOWFLAKE)
        return await command.error("SNOWFLAKE_TOO_BIG");
    } catch {
      return await command.error("SNOWFLAKE_INVALID_INPUT");
    }
    const snowflake = await snowflakeConverter(command, args.snowflake);
    if (!this.userCommand)
      this.userCommand = this.client.getCommand("user") as User;
    if (!this.userCommand || !snowflake) return;
    return await this.userCommand.snowflakeInfo(command, snowflake);
  }
}
