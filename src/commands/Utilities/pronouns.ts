import { MessageEmbed, TextChannel, Permissions, Role } from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser, getPronounsOf } from "@fire/lib/extensions/user";


export default class Pronouns extends Command {
    constructor() {
      super("pronouns", {
        description: (language: Language) =>
          language.get("PRONOUNS_COMMAND_DESCRIPTION"),
        args: [
          {
            id: "user",
            type: "user|member|snowflake",
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
    override async exec(message: FireMessage,
        args: {
          user?:
            FireUser
        }
      ) {
		const user = args.user ?? message.author;
		const author = user.id === message.author.id;

		const pronouns = await getPronounsOf(user);
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