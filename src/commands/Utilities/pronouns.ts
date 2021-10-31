import { MessageEmbed, TextChannel, Permissions, Role, Snowflake, User, ThreadMember, Message, GuildMember, UserResolvable } from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { FireConstants, Pronoun, PronounCode } from "@fire/lib/util/FireConstants";
import { Fire } from "@fire/lib/Fire";
import got from 'got'

export default class Pronouns extends Command {
    constructor() {
      super("pronouns", {
        description: (language: Language) =>
          language.get("PRONOUNS_COMMAND_DESCRIPTION"),
        args: [
          {
            id: "user",
            type: "globalUser",
            required: true,
            default: undefined,
          },
        ],
        aliases: ["pronouns", "pronoun", "pronoundb"],
        enableSlashCommand: true,
        restrictTo: "all",
        slashOnly: true
      });
    }

    public async resolveNonCachedUser(user: UserResolvable | undefined | null): Promise<FireUser | undefined> {
      if (!user) return undefined;
      const id =
        user instanceof User || user instanceof GuildMember || user instanceof ThreadMember
          ? user.id
          : user instanceof Message
          ? user.author.id
          : typeof user === 'string'
          ? user
          : undefined;
      if (!id) return undefined;
      else return await client.users.fetch(id).catch(() => undefined);
    }

    async getPronounsOf(user: User | Snowflake): Promise<Pronoun | undefined> {
      const _user = await this.resolveNonCachedUser(user);
		  if (!_user) throw new Error(`Cannot find ${user}`);
      const apiResolve = (await got
        .get(`https://pronoundb.org/api/v1/lookup?platform=discord&id=${user.id}`)
        .json()
        .catch(() => undefined)) as { pronouns: PronounCode } | undefined;
  
      if (!apiResolve) return undefined;
      if (!apiResolve.pronouns) throw new Error(' apiresolve returned undefined');
  
      return FireConstants.pronounMapping[apiResolve.pronouns];
    }

    override async exec(message: FireMessage,
        args: {
          user?:
            User
        }
      ) {
		const user = args.user ?? message.author;
		const author = user.id === message.author.id;

		const pronouns = await this.getPronounsOf(user);
		if (!pronouns) {
			return await message.util.reply(
				`${author ? 'You do' : `${user.tag} does`} not appear to have any pronouns set. Please${
					author ? '' : ' tell them to'
				} go to https://pronoundb.org/ and set ${author ? 'your' : 'their'} pronouns.`
			);
		} else {
			return await message.util.reply({
				embeds: [
					new MessageEmbed({
						title: `${author ? 'Your' : `${user.tag}'s`} pronouns:`,
						description: pronouns,
						footer: {
							text: 'Data provided by https://pronoundb.org/'
						}
					})
				]
			});
		}
	}
}