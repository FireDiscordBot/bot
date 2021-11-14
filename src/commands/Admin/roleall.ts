import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import 
{ GuildMember, 
  Role,
  Permissions }  from 'discord.js';

export default class RoleAllCommand extends Command {
	public constructor() {
		super('roleAll', {
			aliases: ['role-all', 'rall'],
			category: 'admin',
            userPermissions: [Permissions.FLAGS.ADMINISTRATOR],
			description: "Give a role to al the members of this server",
			args: [
				{
					id: 'role',
					type: 'role',
					prompt: {
						start: 'What role would you like to give to all the members of this server?',
						retry: '{error} Pick a valid role.'
					}
				}
			],
            enableSlashCommand: true,
            restrictTo: "guild",
		});
	}

	async exec(
        message: FireMessage , 
        args: { role: Role }) {
		if (!message.guild) return await message.util.reply('This command can only be run in a server.');

		if (!message.member!.permissions.has('ADMINISTRATOR') )
			return await message.util.reply(`You must have admin perms to use this command.`);

		if (args.role.comparePositionTo(message.guild.me!.roles.highest) >= 0 && !args.role) {
			return await message.util.reply('I cannot give a role higher or equal to my highest role.');
		}

		let members = await message.guild.members.fetch();

		members = members.filter((member: GuildMember) => {
			try {
				if (member.user.bot) return false;
				if (member.roles.cache.has(args.role.id)) return false;
			} catch {
				return false;
			}
			return true;
		});

		await message.util.reply(`Adding roles to ${members.size} members`);

		const promises = members.map((member: GuildMember) => {
			return member.roles.add(args.role, `Role All Command - triggered by ${message.author.tag} (${message.author.id})`);
		});

		const failed = (await Promise.allSettled(promises)).filter((val) => val.status === 'rejected');

		if (!failed.length) {
			await message.util.reply({
				content: `Finished adding <@&${args.role.id}> roles.${
					members.size > 1 ? 's' : ''
				}.`,
			});
		} else {
			const array = [...members.values()];
			await message.util.reply({
				content: ` Finished adding <@&${args.role.id}> to **${members.size - failed.length}** member${
					members.size - failed.length > 1 ? 's' : ''
				}! Failed members:\n${failed.map((_, index) => `<@${array[index].id}>`).join(' ')}`,
			});
		}
	}
}