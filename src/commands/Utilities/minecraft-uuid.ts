import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import {
  MojangAPIError,
  ProfileNotFoundError,
} from "@fire/lib/util/clientutil";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class MinecraftUUID extends Command {
  constructor() {
    super("minecraft-uuid", {
      description: (language: Language) =>
        language.get("MINECRAFT_UUID_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "username",
          type: /\w{1,16}/im,
          readableType: "username",
          description: (language: Language) =>
            language.get("MINECRAFT_UUID_ARGUMENT_USERNAME_DESCRIPTION"),
          default: null,
          required: true,
        },
      ],
      parent: "minecraft",
      restrictTo: "all",
      ephemeral: true,
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: {
      username?: { match: RegExpMatchArray; matches: RegExpExecArray[] };
    }
  ) {
    if (!args.username) return await command.error("MINECRAFT_INVALID_IGN");
    const ign: string = args.username.match[0];
    let profile = await this.client.util
      .mcProfile(ign)
      .catch((e: MojangAPIError) => e);
    if (profile instanceof ProfileNotFoundError)
      return await command.error("MINECRAFT_PROFILE_FETCH_UNKNOWN");
    else if (profile instanceof MojangAPIError)
      return await command.error(
        command.author.isSuperuser()
          ? "MINECRAFT_PROFILE_FETCH_FAIL_FULL"
          : "MINECRAFT_PROFILE_FETCH_FAIL_BASIC",
        { ign, error: profile.message }
      );
    return await command.send("MINECRAFT_UUID", profile);
  }
}
