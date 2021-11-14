/*
	Adapted from https://github.com/NotEnoughUpdates/bush-bot/blob/master/src/commands/admin/roleAll.ts
*/
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Role, Permissions }  from 'discord.js';

export default class RoleAllCommand extends Command {
	constructor() {
		super('roleAll', {
      userPermissions: [Permissions.FLAGS.ADMINISTRATOR],
			clientPermissions: [Permissions.FLAGS.MANAGE_ROLES],
			description: "Give a role to all the members of this server",
			args: [
				{
					id: 'role',
					type: 'role',
					required: true,
				}
			],
            enableSlashCommand: true,
            restrictTo: "guild",
		});
	}

	async exec(
        message: FireMessage , 
        args: { role: Role }) {

		if (args.role.comparePositionTo(message.guild.me!.roles.highest) >= 0 && !args.role) {
			return await message.util.reply('I cannot add a role higher or equal to my highest role.');
		}

		let members = await message.guild.members.fetch();

		members = members.filter((member: FireMember) => {
				if (member.user.bot) return false;
				if (member.roles.cache.has(args.role.id)) return false;
			return true;
		});

		await message.channel.send(`Adding roles to ${members.size} members. This may take a while...`);

		const promises = members.map((member: FireMember) => {
			return member.roles.add(args.role, 'Role All Command');
		});

		const failed = (await Promise.allSettled(promises)).filter((val) => val.status === 'rejected');

		if (!failed.length) {
			await message.channel.send({
				content: `Finished adding <@&${args.role.id}> roles.${
					members.size > 1 ? 's' : ''
				}.`,
			});
		}
	}
}
