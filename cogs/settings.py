import discord
from discord.ext import commands
import datetime
import json
import aiosqlite3
import typing
import asyncio
from fire.invite import findinvite
from fire.youtube import findchannel, findvideo

print("settings.py has been loaded")

with open('config.json', 'r') as cfg:
	config = json.load(cfg)

def isadmin(ctx):
	"""Checks if the author is an admin"""
	if str(ctx.author.id) not in config['admins']:
		admin = False
	else:
		admin = True
	return admin

def byteify(input):
    if isinstance(input, dict):
        return {byteify(key): byteify(value)
                for key, value in input.iteritems()}
    elif isinstance(input, list):
        return [byteify(element) for element in input]
    elif isinstance(input, unicode):
        return input.encode('utf-8')
    else:
        return input

# byteify example
# byteify(json.loads(u"[ 'A','B','C' , ' D']".replace('\'','"')))
# may have a use in the future ¯\_(ツ)_/¯

watchedcmds = ['ban', 'softban', 'mute', 'kick', 'unmute', 'block', 'unblock', 'purge']
region = {
	'amsterdam': '🇳🇱 Amsterdam',
	'brazil': '🇧🇷 Brazil',
	'eu-central': '🇪🇺 Central Europe',
	'eu-west': '🇪🇺 Western Europe',
	'frakfurt': '🇩🇪 Frankfurt',
	'hongkong': '🇭🇰 Hong Kong',
	'india': '🇮🇳 India',
	'japan': '🇯🇵 Japan',
	'england': '🇬🇧 England',
	'russia': '🇷🇺 Russia',
	'singapore': '🇸🇬 Singapore',
	'southafrica': '🇿🇦 South Africa',
	'sydney': '🇦🇺 Sydney',
	'us-central': '🇺🇸 Central US',
	'us-south': '🇺🇸 US South',
	'us-east': '🇺🇸 US East',
	'us-west': '🇺🇸 US West',
	'vip-us-east': '🇺🇸 US East (VIP)',
	'vip-us-west': '🇺🇸 US West (VIP)',
	'vip-amsterdam': '🇳🇱 Amsterdam (VIP)'
}

class settings(commands.Cog, name="Settings"):
	def __init__(self, bot):
		self.bot = bot
		self.logchannels = {}

	async def loadLogChannels(self):
		self.logchannels = {}
		await self.bot.db.execute('SELECT * FROM settings;')
		settings = await self.bot.db.fetchall()
		for s in settings:
			if s[1] != 0:
				guild = s[10]
				self.logchannels[guild] = {
					"channel": s[1]
				}

	@commands.Cog.listener()
	async def on_ready(self):
		await asyncio.sleep(5)
		await self.loadLogChannels()
		print('Log channels loaded!')

	@commands.command(name='loadlogch', description='Load log channels', hidden=True)
	async def loadlogch(self, ctx):
		'''PFXloadlogch'''
		if await self.bot.is_owner(ctx.author):
			await self.loadLogChannels()
			await ctx.send('Loaded data!')
		else:
			await ctx.send('no.')

	@commands.Cog.listener()
	async def on_message_delete(self, message):
		if message.guild and not message.author.bot:
			logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
			if logid:
				logch = message.guild.get_channel(logid['channel'])
			else:
				return
			if logch:
				if message.content == None or message.content  == '':
					message.content = 'I was unable to get the message that was deleted. Maybe it was a system message?'
				embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'{message.author.mention}\'**s message in** {message.channel.mention} **was deleted**\n{message.content}')
				embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
				if message.attachments:
					embed.add_field(name = 'Attachment(s)', value = '\n'.join([attachment.filename for attachment in message.attachments]) + '\n\n__Attachment URLs are invalidated once the message is deleted.__')
				embed.set_footer(text=f"Author ID: {message.author.id} | Message ID: {message.id} | Channel ID: {message.channel.id}")
				await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_message_edit(self, before, after):
		if before.content == after.content:
			return
		if after.guild and not after.author.bot:
			logid = self.logchannels[after.guild.id] if after.guild.id in self.logchannels else None
			if logid:
				logch = after.guild.get_channel(logid['channel'])
			else:
				return
			if logch:
				embed = discord.Embed(color=after.author.color, timestamp=after.created_at, description=f'{after.author.mention} **edited a message in** {after.channel.mention}')
				embed.set_author(name=after.author, icon_url=str(after.author.avatar_url))
				bcontent = before.content [:1020] + (before.content [1020:] and '...')
				acontent = after.content [:1020] + (after.content [1020:] and '...')
				embed.add_field(name='Before', value=bcontent, inline=False)
				embed.add_field(name='After', value=acontent, inline=False)
				embed.set_footer(text=f"Author ID: {after.author.id} | Message ID: {after.id} | Channel ID: {after.channel.id}")
				await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_guild_channel_create(self, channel):
		if channel.guild:
			logid = self.logchannels[channel.guild.id] if channel.guild.id in self.logchannels else None
			if logid:
				logch = channel.guild.get_channel(logid['channel'])
			else:
				return
			if logch:
				embed = discord.Embed(color=discord.Color.green(), timestamp=channel.created_at, description=f'**New channel created: #{channel.name}**')
				embed.set_author(name=channel.guild.name, icon_url=str(channel.guild.icon_url))
				embed.set_footer(text=f"Channel ID: {channel.id} | Guild ID: {channel.guild.id}")
				await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_guild_channel_delete(self, channel):
		if channel.guild:
			logid = self.logchannels[channel.guild.id] if channel.guild.id in self.logchannels else None
			if logid:
				logch = channel.guild.get_channel(logid['channel'])
			else:
				return
			if logch:
				embed = discord.Embed(color=discord.Color.red(), timestamp=channel.created_at, description=f'**Channel deleted: #{channel.name}**')
				embed.set_author(name=channel.guild.name, icon_url=str(channel.guild.icon_url))
				embed.set_footer(text=f"Channel ID: {channel.id} | Guild ID: {channel.guild.id}")
				await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_message(self, message):
		code = findinvite(message.content)
		if code:
			if '/' in code:
				return
			invalidinvite = False
			if isinstance(message.author, discord.Member):
				if not message.author.permissions_in(message.channel).manage_messages:
					if message.guild.me.permissions_in(message.channel).manage_messages:
						await message.delete()
			try:
				invite = await self.bot.fetch_invite(url=code)
			except discord.NotFound or discord.HTTPException as e:
				invalidinvite = True
			if message.guild:
				logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
				if logid:
					logch = message.guild.get_channel(logid['channel'])
				else:
					return
				if logch:
					embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**Invite link sent in** {message.channel.mention}')
					embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
					if invalidinvite:
						embed.add_field(name='Invite Code', value=code, inline=False)
						embed.add_field(name='Valid?', value='false', inline=False)
					elif invite:
						embed.add_field(name='Invite Code', value=code, inline=False)
						embed.add_field(name='Guild', value=f'{invite.guild.name}({invite.guild.id})', inline=False)
						embed.add_field(name='Channel', value=f'#{invite.channel.name}({invite.channel.id})', inline=False)
						embed.add_field(name='Members', value=f'{invite.approximate_member_count} ({invite.approximate_presence_count} active)', inline=False)
					embed.set_footer(text=f"Author ID: {message.author.id}")
					await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_command(self, ctx):
		if ctx.command.name in watchedcmds:
			if ctx.guild:
				logid = self.logchannels[ctx.guild.id] if ctx.guild.id in self.logchannels else None
				if logid:
					logch = ctx.guild.get_channel(logid['channel'])
				else:
					return
				if logch:
					embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.utcnow(), description=f'`{ctx.command.name}` **was used in** {ctx.channel.mention} **by {ctx.author.name}**')
					embed.set_author(name=ctx.author, icon_url=str(ctx.author.avatar_url))
					embed.add_field(name='Message', value=ctx.message.content, inline=False)
					embed.set_footer(text=f"Author ID: {ctx.author.id} | Channel ID: {ctx.channel.id}")
					await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_member_update(self, before, after):
		if before.nick != after.nick:
			logid = self.logchannels[after.guild.id] if after.guild.id in self.logchannels else None
			if logid:
				logch = after.guild.get_channel(logid['channel'])
			else:
				return
			if logch:
				embed = discord.Embed(color=after.color, timestamp=datetime.datetime.utcnow(), description=f'{after.mention}\'**s nickname was changed**')
				embed.set_author(name=after, icon_url=str(after.avatar_url))
				embed.add_field(name='Before', value=before.nick, inline=False)
				embed.add_field(name='After', value=after.nick, inline=False)
				embed.set_footer(text=f"Author ID: {after.id}")
				await logch.send(embed=embed)
		if before.roles != after.roles:
			logid = self.logchannels[after.guild.id] if after.guild.id in self.logchannels else None
			if logid:
				logch = after.guild.get_channel(logid['channel'])
			else:
				return
			if logch:
				broles = []
				aroles = []
				changed = []
				for role in before.roles:
					broles.append(role.name)
				for role in after.roles:
					aroles.append(role.name)
				s = set(aroles)
				removed = [x for x in broles if x not in s]
				s = set(broles)
				added = [x for x in aroles if x not in s]
				if len(added) == 1:
					role = discord.utils.get(after.guild.roles, name=added[0])
					embed = discord.Embed(color=role.color, timestamp=datetime.datetime.utcnow(), description=f'{after.mention}\'s roles were changed\n**{after.name} was given the** {role.mention} **role**')
					embed.set_author(name=after, icon_url=str(after.avatar_url))
					embed.set_footer(text=f"Member ID: {after.id} | Role ID: {role.id}")
					await logch.send(embed=embed)
				if len(removed) == 1:
					role = discord.utils.get(after.guild.roles, name=removed[0])
					embed = discord.Embed(color=role.color, timestamp=datetime.datetime.utcnow(), description=f'{after.mention}\'s roles were changed\n**{after.name} was removed from the** {role.mention} **role**')
					embed.set_author(name=after, icon_url=str(after.avatar_url))
					embed.set_footer(text=f"Member ID: {after.id} | Role ID: {role.id}")
					await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_guild_channel_pins_update(self, channel, last_pin = 0):
			logid = self.logchannels[channel.guild.id] if channel.guild.id in self.logchannels else None
			if logid:
				logch = channel.guild.get_channel(logid['channel'])
			else:
				return
			if logch:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'{channel.mention}\'**s pinned messages were updated**')
				embed.set_author(name=channel.guild.name, icon_url=str(channel.guild.icon_url))
				embed.set_footer(text=f"Channel ID: {channel.id}")
				await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_guild_role_create(self, role):
		logid = self.logchannels[role.guild.id] if role.guild.id in self.logchannels else None
		if logid:
			logch = role.guild.get_channel(logid['channel'])
		else:
			return
		if logch:
			embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**A new role was created**\n{role.mention}')
			embed.set_author(name=role.guild.name, icon_url=str(role.guild.icon_url))
			embed.set_footer(text=f"Role ID: {role.id}")
			await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_guild_role_delete(self, role):
		logid = self.logchannels[role.guild.id] if role.guild.id in self.logchannels else None
		if logid:
			logch = role.guild.get_channel(logid['channel'])
		else:
			return
		if logch:
			embed = discord.Embed(color=role.color, timestamp=datetime.datetime.utcnow(), description=f'**The role** `{role.name}` **was deleted**')
			embed.set_author(name=role.guild.name, icon_url=str(role.guild.icon_url))
			embed.set_footer(text=f"Role ID: {role.id}")
			await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_voice_state_update(self, member, before, after):
		logid = self.logchannels[member.guild.id] if member.guild.id in self.logchannels else None
		if logid:
			logch = member.guild.get_channel(logid['channel'])
		else:
			return
		if logch:
			if before.deaf != after.deaf:
				if after.deaf:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **was server deafened**')
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					if after.channel:
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed.set_footer(text=f"Member ID: {member.id}")
					await logch.send(embed=embed)
				elif not after.deaf:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **was server undeafened**')
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					if after.channel:
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed.set_footer(text=f"Member ID: {member.id}")
					await logch.send(embed=embed)
			if before.mute != after.mute:
				if after.mute:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **was server muted**')
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					if after.channel:
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed.set_footer(text=f"Member ID: {member.id}")
					await logch.send(embed=embed)
				elif not after.mute:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **was server unmuted**')
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					if after.channel:
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed.set_footer(text=f"Member ID: {member.id}")
					await logch.send(embed=embed)
			if before.self_video != after.self_video:
				if after.self_video:
					if after.channel:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **started sharing video in {after.channel.name}**')
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **started sharing video**')
						embed.set_footer(text=f"Member ID: {member.id}")
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					await logch.send(embed=embed)
				elif not after.self_video:
					if after.channel:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **stopped sharing video in {after.channel.name}**')
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **stopped sharing video**')
						embed.set_footer(text=f"Member ID: {member.id}")
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					await logch.send(embed=embed)
			if before.channel != after.channel:
				if before.channel and after.channel:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **switched voice channel**')
					embed.add_field(name='Before', value=before.channel.name, inline=False)
					embed.add_field(name='After', value=after.channel.name, inline=False)
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					embed.set_footer(text=f"Member ID: {member.id} | Old Channel ID: {before.channel.id} | New Channel ID: {after.channel.id}")
					await logch.send(embed=embed)
				if after.channel:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **joined voice channel {after.channel.name}**')
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					await logch.send(embed=embed)
				elif not after.channel:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **left voice channel {before.channel.name}**')
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {before.channel.id}")
					await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_guild_update(self, before, after):
		logid = self.logchannels[after.id] if after.id in self.logchannels else None
		if logid:
			logch = after.get_channel(logid['channel'])
		else:
			return
		if logch:
			if before.name != after.name:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**Guild name was changed**')
				embed.add_field(name='Before', value=before.name, inline=False)
				embed.add_field(name='After', value=after.name, inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				await logch.send(embed=embed)
			if before.region != after.region:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s region was changed**')
				embed.add_field(name='Before', value=region[str(before.region)], inline=False)
				embed.add_field(name='After', value=region[str(after.region)], inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				await logch.send(embed=embed)
			if before.owner != after.owner:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name} was transferred to a new owner**')
				embed.add_field(name='Before', value=before.owner, inline=False)
				embed.add_field(name='After', value=after.owner, inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id} | Old Owner ID: {before.owner.id} | New Owner ID: {after.owner.id}")
				await logch.send(embed=embed)
			if before.verification_level != after.verification_level:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s verification level was changed**')
				embed.add_field(name='Before', value=str(before.verification_level).capitalize(), inline=False)
				embed.add_field(name='After', value=str(after.verification_level).capitalize(), inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				await logch.send(embed=embed)
			if before.explicit_content_filter != after.explicit_content_filter:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s content filter level was changed**')
				embed.add_field(name='Before', value=str(before.explicit_content_filter).capitalize().replace('_', ''), inline=False)
				embed.add_field(name='After', value=str(after.explicit_content_filter).capitalize().replace('_', ''), inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				await logch.send(embed=embed)
			if before.features != after.features:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s features were updated**')
				s = set(after.features)
				removed = [x for x in before.features if x not in s]
				s = set(before.features)
				added = [x for x in after.features if x not in s]
				if added != []:
					features = []
					for feature in added:
						features.append(f'> {feature}')
					embed.add_field(name='Added', value='\n'.join(features), inline=False)
				if removed != []:
					features = []
					for feature in removed:
						features.append(f'> {feature}')
					embed.add_field(name='Removed', value='\n'.join(features), inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				await logch.send(embed=embed)
			if before.banner != after.banner:
				if after.banner:
					embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s banner was changed**')
					embed.set_image(url=str(after.banner_url))
				else:
					embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s banner was removed**')
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				await logch.send(embed=embed)
			if before.splash != after.splash:
				if after.banner:
					embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s splash was changed**')
					embed.set_image(url=str(after.splash_url))
				else:
					embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s splash was removed**')
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				await logch.send(embed=embed)
			if before.premium_tier != after.premium_tier:
				if after.premium_tier > before.premium_tier:
					embed = discord.Embed(color=discord.Color.from_rgb(255, 115, 250), timestamp=datetime.datetime.utcnow(), description=f'**{after.name} got boosted to Tier {after.premium_tier}**')
				if after.premium_tier > before.premium_tier:
					embed = discord.Embed(color=discord.Color.from_rgb(255, 115, 250), timestamp=datetime.datetime.utcnow(), description=f'**{after.name} got weakened to Tier {after.premium_tier}**')
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				await logch.send(embed=embed)
			if before.system_channel != after.system_channel:
				if after.system_channel:
					embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s system channel was changed to {after.system_channel.mention}**')
				else:
					embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s system channel was removed**')
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_member_ban(self, guild, member):
		logid = self.logchannels[guild.id] if guild.id in self.logchannels else None
		if logid:
			logch = guild.get_channel(logid['channel'])
		else:
			return
		if logch:
			embed = discord.Embed(color=member.color if member.color != discord.Color.default() else discord.Color.red(), timestamp=datetime.datetime.utcnow(), description=f'**{member.mention} was banned**')
			embed.set_author(name=member, icon_url=str(member.avatar_url))
			embed.set_footer(text=f"Member ID: {member.id}")
			await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_member_unban(self, guild, member):
		logid = self.logchannels[guild.id] if guild.id in self.logchannels else None
		if logid:
			logch = guild.get_channel(logid['channel'])
		else:
			return
		if logch:
			embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{member} was unbanned**')
			embed.set_author(name=member, icon_url=str(member.avatar_url))
			embed.set_footer(text=f"Member ID: {member.id}")
			await logch.send(embed=embed)

	@commands.group(name='gsettings', description='Guild Settings [Work In Progress]', invoke_without_command=True, ignore_extra=False)
	async def gsettings(self, ctx):
		'''PFXgsettings [<logs <channel>|another setting <arg>|more settings <arg>]'''
		await self.bot.db.execute(f'SELECT * FROM settings WHERE gid = {ctx.guild.id}')
		guildsettings = await self.bot.db.fetchone()
		if guildsettings == None:
			msg = await ctx.send('Settings not found! Generating settings with default values')
			await self.bot.db.execute(f'INSERT INTO settings (\"gid\") VALUES ({ctx.guild.id});')
			await self.bot.conn.commit()
			await self.bot.db.execute(f'SELECT * FROM settings WHERE gid = {ctx.guild.id}')
			guildsettings = await self.bot.db.fetchone()
		logging = guildsettings[1]
		logchan = None
		if logging != 0:
			try:
				logchan = self.bot.get_channel(logging)
			except discord.NotFound:
				await self.bot.db.execute(f'UPDATE settings SET logging = 0 WHERE gid = {ctx.guild.id}')
				await self.bot.conn.commit()
				logging = False
		else:
			logging = False
		globalbans = bool(guildsettings[2])
		welcome = guildsettings[3]
		welcomechan = None
		if welcome != 0:
			try:
				welcomechan = self.bot.get_channel(welcome)
			except discord.NotFound:
				await self.bot.db.execute(f'UPDATE settings SET welcome = 0 WHERE gid = {ctx.guild.id}')
				await self.bot.conn.commit()
				welcome = False
		else:
			welcome = False
		goodbye = guildsettings[4]
		goodbyechan = None
		if goodbye != 0:
			try:
				goodbyechan = self.bot.get_channel(goodbye)
			except discord.NotFound:
				await self.bot.db.execute(f'UPDATE settings SET goodbye = 0 WHERE gid = {ctx.guild.id}')
				await self.bot.conn.commit()
				goodbye = False
		else:
			goodbye = False
		inviteblock = bool(guildsettings[5])
		embed = discord.Embed(title=":gear: Guild Settings", colour=ctx.author.color, url="https://discordapp.com", description="Here's a list of the current guild settings", timestamp=datetime.datetime.utcnow())
		embed.set_author(name=ctx.guild.name, icon_url=ctx.guild.icon_url)
		if type(logchan) == discord.TextChannel:
			embed.add_field(name="Logging", value=logchan.mention, inline=False)
		elif logchan == None:
			embed.add_field(name="Logging", value=logging, inline=False)
		embed.add_field(name="Global Ban Check (KSoft.Si API)", value=globalbans, inline=False)
		embed.add_field(name="Welcome Messages", value=welcomechan or welcome, inline=False)
		embed.add_field(name="Goodbye Messages", value=goodbyechan or goodbye, inline=False)
		embed.add_field(name="Invite Filter", value=inviteblock, inline=False)
		await ctx.send(embed=embed)

	@gsettings.command(name='logs', aliases=['logging', 'log'])
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def settings_logs(self, ctx, newlog: typing.Union[discord.TextChannel, int] = None):
		'''PFXgsettings logs <channel>'''
		if newlog == None:
			raise commands.UserInputError('Missing argument! Provide a channel for me to send logs to or 0 to disable logging')
		elif newlog == 0:
			await self.bot.db.execute(f'UPDATE settings SET logging = 0 WHERE gid = {ctx.guild.id}')
			await self.bot.conn.commit()
			await ctx.send(f'Successfully disabled logging in {discord.utils.escape_mentions(ctx.guild.name)}', delete_after=5)
			await self.loadLogChannels()
		else:
			if type(newlog) == int:
				channel = self.bot.get_channel(newlog)
				if channel == None:
					await ctx.send(f'Invalid channel ID provided! Use `0` to disable or provide a valid channel')
					return
				await self.bot.db.execute(f'UPDATE settings SET logging = {newlog} WHERE gid = {ctx.guild.id}')
				await self.bot.conn.commit()
				await self.loadLogChannels()
				await ctx.send(f'Updated logs setting.')
			elif type(newlog) == discord.TextChannel:
				try:
					self.bot.get_channel(newlog.id)
				except discord.NotFound:
					await ctx.send(f'Invalid channel provided! Use `0` to disable or provide a valid channel')
					return
				await self.bot.db.execute(f'UPDATE settings SET logging = {newlog.id} WHERE gid = {ctx.guild.id}')
				await self.bot.conn.commit()
				await self.loadLogChannels()
				await ctx.send(f'Successfully enabled logging in {newlog.mention}', delete_after=5)
			else:
				raise commands.BadArgument('Invalid value provided. Use 0 to disable or provide a channel (name, mention, id) to enable')
		


def setup(bot):
	bot.add_cog(settings(bot))