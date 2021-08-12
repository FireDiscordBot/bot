import { NewsChannel, ThreadChannel, DMChannel, Snowflake } from "discord.js";
import { ApplicationCommandMessage } from "../extensions/slashcommandmessage";
import { ComponentMessage } from "../extensions/componentmessage";
import { FireTextChannel } from "../extensions/textchannel";
import { FireGuild } from "../extensions/guild";
import { Fire } from "../Fire";

// basefakechannel more like basedfakechannel amirite
export class BaseFakeChannel {
  get name(): string {
    return "";
  }
  real: FireTextChannel | NewsChannel | ThreadChannel | DMChannel;
  message: ApplicationCommandMessage | ComponentMessage;
  interactionId: Snowflake;
  guild?: FireGuild;
  token: string;
  id: Snowflake;
  client: Fire;
}
