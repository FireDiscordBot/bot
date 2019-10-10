"""
MIT License
Copyright (c) 2019 GamingGeek

Permission is hereby granted, free of charge, to any person obtaining a copy of this software
and associated documentation files (the "Software"), to deal in the Software without restriction, 
including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, 
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE 
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION 
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
"""

import discord
from discord.ext import commands
import datetime
import json
import asyncpg
import typing
import asyncio
import aiohttp
import humanfriendly
import functools
from random import randint
from fire.converters import TextChannel
from fire.invite import findinvite
from fire.youtube import findchannel, findvideo

print("settings.py has been loaded")

with open('config_prod.json', 'r') as cfg:
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

watchedcmds = ['purge']
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
		self.invitefiltered = []
		self.gbancheck = []
		self.autodecancer = []
		self.autodehoist = []
		self.modonly = {}
		self.adminonly = {}
		self.deletedroles = []
	
	async def loadSettings(self):
		self.logchannels = {}
		self.invitefiltered = []
		self.gbancheck = []
		self.autodecancer = []
		self.autodehoist = []
		self.modonly = {}
		self.adminonly = {}
		query = 'SELECT * FROM settings;'
		settings = await self.bot.db.fetch(query)
		for s in settings:
			guild = s['gid']
			if s['inviteblock'] == 1:
				self.invitefiltered.append(guild)
			if s['globalbans'] == 1:
				self.gbancheck.append(guild)
			if s['autodecancer'] == 1:
				self.autodecancer.append(guild)
			if s['autodehoist'] == 1:
				self.autodehoist.append(guild)
			if s['modonly']:
				if guild not in self.modonly:
					self.modonly[guild] = []
				for cid in s['modonly']:
					self.modonly[guild].append(cid)
			if s['adminonly']:
				if guild not in self.adminonly:
					self.adminonly[guild] = []
				for cid in s['adminonly']:
					self.adminonly[guild].append(cid)
			if s['modlogs'] == 0:
				modlogs = False
			else:
				modlogs = s['modlogs']
			if s['actionlogs'] == 0:
				actionlogs = False
			else:
				actionlogs = s['actionlogs']
			guildobj = self.bot.get_guild(guild)
			if not guildobj:
				modlogs = False
				actionlogs = False
			else:
				if modlogs:
					cmodlogs = discord.utils.get(guildobj.channels, id=modlogs)
					if type(cmodlogs) != discord.TextChannel:
						modlogs = False
				if actionlogs:
					cactionlogs = discord.utils.get(guildobj.channels, id=actionlogs)
					if type(cactionlogs) != discord.TextChannel:
						actionlogs = False
			self.logchannels[guild] = {
				"modlogs": modlogs,
				"actionlogs": actionlogs
			}

	@commands.Cog.listener()
	async def on_ready(self):
		await asyncio.sleep(5)
		await self.loadSettings()
		print('Settings loaded (on_ready)!')

	@commands.command(name='loadsettings', description='Load settings', hidden=True)
	async def loadthesettings(self, ctx):
		'''PFXloadsettings'''
		if await self.bot.is_team_owner(ctx.author):
			await self.loadSettings()
			await ctx.send('Loaded data!')
		else:
			await ctx.send('no.')

	@commands.Cog.listener()
	async def on_message_delete(self, message):
		if message.guild and not message.author.bot:
			if message.channel.id == 600068336331522079:
				return
			logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
			if logid:
				logch = message.guild.get_channel(logid['actionlogs'])
			else:
				return
			if logch:
				if message.system_content == None or message.system_content  == '':
					message.content = 'I was unable to get the message that was deleted. Maybe it was a system message?'
				embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'{message.author.mention}\'**s message in** {message.channel.mention} **was deleted**\n{message.system_content}')
				embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
				if message.attachments:
					embed.add_field(name = 'Attachment(s)', value = '\n'.join([attachment.filename for attachment in message.attachments]) + '\n\n__Attachment URLs are invalidated once the message is deleted.__')
				embed.set_footer(text=f"Author ID: {message.author.id} | Message ID: {message.id} | Channel ID: {message.channel.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass

	@commands.Cog.listener()
	async def on_message_edit(self, before, after):
		if after.channel.type == discord.ChannelType.news and after.author.permissions_in(after.channel).manage_messages:
			raw = await self.bot.http.get_message(after.channel.id, after.id)
			if raw['flags'] == 2:
				logid = self.logchannels[after.guild.id] if after.guild.id in self.logchannels else None
				if logid:
					logch = after.guild.get_channel(logid['actionlogs'])
				else:
					return
				if logch:
					embed = discord.Embed(color=discord.Color.green(), timestamp=after.created_at, description=f'**A message was published in** {after.channel.mention}')
					embed.set_author(name=after.guild.name, icon_url=str(after.guild.icon_url))
					embed.add_field(name='Message Author', value=after.author.mention, inline=False)
					embed.add_field(name='Message', value=f'[Click Here]({after.jump_url})', inline=False)
					embed.set_footer(text=f"Author ID: {after.author.id} | Message ID: {after.id} | Channel ID: {after.channel.id}")
					try:
						return await logch.send(embed=embed)
					except Exception:
						pass
		if before.content == after.content:
			return
		message = after
		code = findinvite(message.system_content)
		invite = None
		if code:
			if '/' in code:
				return
			invalidinvite = False
			if isinstance(message.author, discord.Member):
				if not message.author.permissions_in(message.channel).manage_messages:
					if message.guild.me.permissions_in(message.channel).manage_messages:
						if message.guild.id in self.invitefiltered:
							try:
								invite = await self.bot.fetch_invite(url=code)
								if invite.guild.id == message.guild.id:
									pass
								else:
									await message.delete()
							except Exception:
								pass
			try:
				ohmygod = False
				if code.lower() in self.bot.vanity_urls and 'oh-my-god.wtf' in message.system_content:
					invite = self.bot.vanity_urls[code]
					ohmygod = True
					if isinstance(message.author, discord.Member):
						if not message.author.permissions_in(message.channel).manage_messages:
							if message.guild.me.permissions_in(message.channel).manage_messages:
								if message.guild.id in self.invitefiltered:
									if invite['gid'] != message.guild.id:
										try:
											await message.delete()
										except Exception:
											pass
				else:
					if not invite or type(invite) != discord.Invite:
						invite = await self.bot.fetch_invite(url=code)
			except discord.NotFound or discord.HTTPException as e:
				invalidinvite = True
			if message.guild:
				if message.author.bot:
					return
				logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
				if logid:
					logch = message.guild.get_channel(logid['actionlogs'])
				else:
					return
				if logch:
					embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**Invite link sent in** {message.channel.mention}')
					embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
					if invalidinvite:
						if '.png' in code:
							return
						embed.add_field(name='Invite Code', value=code, inline=False)
						embed.add_field(name='Valid?', value='false', inline=False)
					elif ohmygod:
						invite = await self.bot.fetch_invite(url=invite['invite'])
						embed.add_field(name='Invite Code', value=code, inline=False)
						embed.add_field(name='Vanity URL', value=f'[oh-my-god.wtf/{code}](https://oh-my-god.wtf/{code})', inline=False)
						embed.add_field(name='Guild', value=f'{invite.guild.name}({invite.guild.id})', inline=False)
						embed.add_field(name='Channel', value=f'#{invite.channel.name}({invite.channel.id})', inline=False)
						embed.add_field(name='Members', value=f'{invite.approximate_member_count} ({invite.approximate_presence_count} active)', inline=False)
					elif invite and not ohmygod:
						embed.add_field(name='Invite Code', value=code, inline=False)
						embed.add_field(name='Guild', value=f'{invite.guild.name}({invite.guild.id})', inline=False)
						embed.add_field(name='Channel', value=f'#{invite.channel.name}({invite.channel.id})', inline=False)
						embed.add_field(name='Members', value=f'{invite.approximate_member_count} ({invite.approximate_presence_count} active)', inline=False)
					embed.set_footer(text=f"Author ID: {message.author.id}")
					try:
						return await logch.send(embed=embed)
					except Exception:
						pass
		if before.system_content == after.system_content:
			return
		if after.guild and not after.author.bot:
			logid = self.logchannels[after.guild.id] if after.guild.id in self.logchannels else None
			if logid:
				logch = after.guild.get_channel(logid['actionlogs'])
			else:
				return
			if logch:
				embed = discord.Embed(color=after.author.color, timestamp=after.created_at, description=f'{after.author.mention} **edited a message in** {after.channel.mention}')
				embed.set_author(name=after.author, icon_url=str(after.author.avatar_url))
				bcontent = before.system_content [:300] + (before.system_content [300:] and '...')
				acontent = after.system_content [:300] + (after.system_content [300:] and '...')
				embed.add_field(name='Before', value=bcontent, inline=False)
				embed.add_field(name='After', value=acontent, inline=False)
				embed.set_footer(text=f"Author ID: {after.author.id} | Message ID: {after.id} | Channel ID: {after.channel.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass

	@commands.Cog.listener()
	async def on_guild_channel_create(self, channel):
		if channel.guild:
			logid = self.logchannels[channel.guild.id] if channel.guild.id in self.logchannels else None
			if logid:
				logch = channel.guild.get_channel(logid['actionlogs'])
			else:
				return
			if logch:
				embed = discord.Embed(color=discord.Color.green(), timestamp=channel.created_at, description=f'**New channel created: #{channel.name}**')
				embed.set_author(name=channel.guild.name, icon_url=str(channel.guild.icon_url))
				embed.set_footer(text=f"Channel ID: {channel.id} | Guild ID: {channel.guild.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass

	@commands.Cog.listener()
	async def on_guild_channel_delete(self, channel):
		if channel.guild:
			logid = self.logchannels[channel.guild.id] if channel.guild.id in self.logchannels else None
			if logid:
				logch = channel.guild.get_channel(logid['actionlogs'])
			else:
				return
			if logch:
				embed = discord.Embed(color=discord.Color.red(), timestamp=channel.created_at, description=f'**Channel deleted: #{channel.name}**')
				embed.set_author(name=channel.guild.name, icon_url=str(channel.guild.icon_url))
				embed.set_footer(text=f"Channel ID: {channel.id} | Guild ID: {channel.guild.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass

	@commands.Cog.listener()
	async def on_message(self, message):
		code = findinvite(message.system_content)
		invite = None
		if code:
			if '/' in code:
				return
			invalidinvite = False
			if isinstance(message.author, discord.Member):
				if not message.author.permissions_in(message.channel).manage_messages:
					if message.guild.me.permissions_in(message.channel).manage_messages:
						if message.guild.id in self.invitefiltered:
							try:
								invite = await self.bot.fetch_invite(url=code)
								if invite.guild.id == message.guild.id:
									pass
								else:
									await message.delete()
							except Exception:
								pass
			try:
				ohmygod = False
				if code.lower() in self.bot.vanity_urls:
					invite = self.bot.vanity_urls[code]
					ohmygod = True
					if isinstance(message.author, discord.Member):
						if not message.author.permissions_in(message.channel).manage_messages:
							if message.guild.me.permissions_in(message.channel).manage_messages:
								if message.guild.id in self.invitefiltered:
									if invite['gid'] != message.guild.id:
										await message.delete()
				else:
					if not invite or type(invite) != discord.Invite:
						invite = await self.bot.fetch_invite(url=code)
			except discord.NotFound or discord.HTTPException as e:
				invalidinvite = True
			if message.guild:
				if message.author.bot:
					return
				logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
				if logid:
					logch = message.guild.get_channel(logid['actionlogs'])
				else:
					return
				if logch:
					embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**Invite link sent in** {message.channel.mention}')
					embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
					if invalidinvite:
						if '.png' in code:
							return
						embed.add_field(name='Invite Code', value=code, inline=False)
						embed.add_field(name='Valid?', value='false', inline=False)
					elif ohmygod:
						invite = await self.bot.fetch_invite(url=invite['invite'])
						embed.add_field(name='Invite Code', value=code, inline=False)
						embed.add_field(name='Vanity URL', value=f'[oh-my-god.wtf/{code}](https://oh-my-god.wtf/{code})', inline=False)
						embed.add_field(name='Guild', value=f'{invite.guild.name}({invite.guild.id})', inline=False)
						embed.add_field(name='Channel', value=f'#{invite.channel.name}({invite.channel.id})', inline=False)
						embed.add_field(name='Members', value=f'{invite.approximate_member_count} ({invite.approximate_presence_count} active)', inline=False)
					elif invite and not ohmygod:
						embed.add_field(name='Invite Code', value=code, inline=False)
						embed.add_field(name='Guild', value=f'{invite.guild.name}({invite.guild.id})', inline=False)
						embed.add_field(name='Channel', value=f'#{invite.channel.name}({invite.channel.id})', inline=False)
						embed.add_field(name='Members', value=f'{invite.approximate_member_count} ({invite.approximate_presence_count} active)', inline=False)
					embed.set_footer(text=f"Author ID: {message.author.id}")
					try:
						await logch.send(embed=embed)
					except Exception:
						pass

	@commands.Cog.listener()
	async def on_command_completion(self, ctx):
		await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'commands.used'))
		if ctx.command.name in watchedcmds:
			if ctx.guild:
				logid = self.logchannels[ctx.guild.id] if ctx.guild.id in self.logchannels else None
				if logid:
					logch = ctx.guild.get_channel(logid['actionlogs'])
				else:
					return
				if logch:
					embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.utcnow(), description=f'`{ctx.command.name}` **was used in** {ctx.channel.mention} **by {ctx.author.name}**')
					embed.set_author(name=ctx.author, icon_url=str(ctx.author.avatar_url))
					embed.add_field(name='Message', value=ctx.message.system_content, inline=False)
					embed.set_footer(text=f"Author ID: {ctx.author.id} | Channel ID: {ctx.channel.id}")
					if ctx.command.name == 'purge':
						try:
							purged = self.bot.recentpurge[ctx.channel.id]
						except KeyError as e:
							purged = None
						if purged:
							async with aiohttp.ClientSession() as s:
								async with s.post('https://hasteb.in/documents', data=json.dumps(self.bot.recentpurge[ctx.channel.id], indent=4)) as r:
									j = await r.json()
									key = j['key'] + '.json'
									embed.add_field(name='Purged Messages', value=f'https://hasteb.in/{key}', inline=False)
					try:
						await logch.send(embed=embed)
					except Exception:
						pass

	@commands.Cog.listener()
	async def on_member_join(self, member):
		await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'members.join'))
		logid = self.logchannels[member.guild.id] if member.guild.id in self.logchannels else None
		if logid:
			logch = member.guild.get_channel(logid['modlogs'])
		else:
			return
		if logch:
			#https://giphy.com/gifs/pepsi-5C0a8IItAWRebylDRX
			embed = discord.Embed(title='Member Joined', url='https://i.giphy.com/media/Nx0rz3jtxtEre/giphy.gif', color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
			embed.set_author(name=f'{member}', icon_url=str(member.avatar_url))
			embed.add_field(name='Account Created', value=humanfriendly.format_timespan(datetime.datetime.utcnow() - member.created_at) + ' ago', inline=False)
			embed.set_footer(text=f'User ID: {member.id}')
			try:
				await logch.send(embed=embed)
			except Exception:
				pass
		try:
			if member.guild.id in self.autodecancer:
				decancered = False
				if not self.bot.isascii(member.name):
					num = member.discriminator
					decancered = True
					await member.edit(nick=f'John Doe {num}')
					logid = self.logchannels[member.guild.id] if member.guild.id in self.logchannels else None
					if logid:
						logch = member.guild.get_channel(logid['modlogs'])
					else:
						return
					if logch:
						embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
						embed.set_author(name=f'Auto-Decancer | {member}', icon_url=str(member.avatar_url))
						embed.add_field(name='User', value=f'{member}({member.id})', inline=False)
						embed.add_field(name='Reason', value='Username contains non-ascii characters', inline=False)
						embed.set_footer(text=f'User ID: {member.id}')
						try:
							await logch.send(embed=embed)
						except Exception:
							pass
			if member.guild.id in self.autodehoist:
				if self.bot.ishoisted(member.name) and not decancered:
					num = member.discriminator
					await member.edit(nick=f'John Doe {num}')
					logid = self.logchannels[member.guild.id] if member.guild.id in self.logchannels else None
					if logid:
						logch = member.guild.get_channel(logid['modlogs'])
					else:
						return
					if logch:
						embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
						embed.set_author(name=f'Auto-Dehoist | {member}', icon_url=str(member.avatar_url))
						embed.add_field(name='User', value=f'{member}({member.id})', inline=False)
						embed.add_field(name='Reason', value='Username starts with a non A-Z character', inline=False)
						embed.set_footer(text=f'User ID: {member.id}')
						try:
							await logch.send(embed=embed)
						except Exception:
							pass
		except Exception:
			pass

	@commands.Cog.listener()
	async def on_member_remove(self, member):
		await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'members.leave'))
		logid = self.logchannels[member.guild.id] if member.guild.id in self.logchannels else None
		if logid:
			logch = member.guild.get_channel(logid['modlogs'])
		else:
			return
		if logch:
			embed = discord.Embed(title='Member Left', url='https://i.giphy.com/media/5C0a8IItAWRebylDRX/source.gif', color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
			embed.set_author(name=f'{member}', icon_url=str(member.avatar_url))
			embed.add_field(name='Nickname', value=member.nick or member.name, inline=False)
			roles = [role.mention for role in member.roles if role != member.guild.default_role]
			embed.add_field(name='Roles', value=', '.join(roles) if roles else 'No roles', inline=False)
			embed.set_footer(text=f'User ID: {member.id}')
			try:
				await logch.send(embed=embed)
			except Exception:
				pass

	@commands.Cog.listener()
	async def on_user_update(self, before, after):
		for guild in self.bot.guilds:
			if before.name != after.name:
				try:
					member = guild.get_member(after.id)
					if member:
						if guild.id in self.autodecancer:
							nitroboosters = discord.utils.get(member.guild.roles, name='Nitro Booster')
							if member.guild_permissions.manage_nicknames or nitroboosters in member.roles:
								pass
							else:
								decancered = False
								nick = after.name
								tochange = 'Username'
								if not self.bot.isascii(nick):
									num = member.discriminator
									decancered = True
									await member.edit(nick=f'John Doe {num}')
									logid = self.logchannels[member.guild.id] if member.guild.id in self.logchannels else None
									if logid:
										logch = member.guild.get_channel(logid['modlogs'])
									else:
										return
									if logch:
										embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
										embed.set_author(name=f'Auto-Decancer | {member}', icon_url=str(member.avatar_url))
										embed.add_field(name='User', value=f'{member}({member.id})', inline=False)
										embed.add_field(name='Reason', value=f'{tochange} contains non-ascii characters', inline=False)
										if tochange == 'Nickname':
											embed.add_field(name='Nickname', value=nick, inline=False)
										embed.set_footer(text=f'User ID: {member.id}')
										try:
											return await logch.send(embed=embed)
										except Exception:
											pass
								else:
									if member.nick and 'John Doe' in member.nick:
										await member.edit(nick=None)
						if member.guild.id in self.autodehoist:
							nitroboosters = discord.utils.get(member.guild.roles, name='Nitro Booster')
							if member.guild_permissions.manage_nicknames or nitroboosters in member.roles:
								pass
							else:
								dehoisted = False
								nick = after.name
								tochange = 'Username'
								if self.bot.ishoisted(nick) and not decancered:
									num = member.discriminator
									dehoisted = True
									await member.edit(nick=f'John Doe {num}')
									logid = self.logchannels[member.guild.id] if member.guild.id in self.logchannels else None
									if logid:
										logch = member.guild.get_channel(logid['modlogs'])
									else:
										return
									if logch:
										embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
										embed.set_author(name=f'Auto-Dehoist | {member}', icon_url=str(member.avatar_url))
										embed.add_field(name='User', value=f'{member}({member.id})', inline=False)
										embed.add_field(name='Reason', value=f'{tochange} starts with a non A-Z character', inline=False)
										if tochange == 'Nickname':
											embed.add_field(name='Nickname', value=nick, inline=False)
										embed.set_footer(text=f'User ID: {member.id}')
										try:
											return await logch.send(embed=embed)
										except Exception:
											pass
								else:
									if member.nick and 'John Doe' in member.nick:
										await member.edit(nick=None)
				except Exception:
					pass

	@commands.Cog.listener()
	async def on_member_update(self, before, after):
		if after.nick != None and f'John Doe {after.discriminator}' in after.nick:
			return
		if before.nick != after.nick:
			try:
				if after.guild.id in self.autodecancer:
					nitroboosters = discord.utils.get(after.guild.roles, name='Nitro Booster')
					if after.guild_permissions.manage_nicknames or nitroboosters in after.roles:
						pass
					else:
						decancered = False
						if not after.nick:
							nick = after.name
							tochange = 'Username'
						else:
							nick = after.nick
							tochange = 'Nickname'
						if not self.bot.isascii(nick):
							num = after.discriminator
							decancered = True
							await after.edit(nick=f'John Doe {num}')
							logid = self.logchannels[after.guild.id] if after.guild.id in self.logchannels else None
							if logid:
								logch = after.guild.get_channel(logid['modlogs'])
							else:
								return
							if logch:
								embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
								embed.set_author(name=f'Auto-Decancer | {after}', icon_url=str(after.avatar_url))
								embed.add_field(name='User', value=f'{after}({after.id})', inline=False)
								embed.add_field(name='Reason', value=f'{tochange} contains non-ascii characters', inline=False)
								if tochange == 'Nickname':
									embed.add_field(name='Nickname', value=nick, inline=False)
								embed.set_footer(text=f'User ID: {after.id}')
								try:
									return await logch.send(embed=embed)
								except Exception:
									pass
				if after.guild.id in self.autodehoist:
					nitroboosters = discord.utils.get(after.guild.roles, name='Nitro Booster')
					if after.guild_permissions.manage_nicknames or nitroboosters in after.roles:
						pass
					else:
						dehoisted = False
						if not after.nick:
							nick = after.name
							tochange = 'Username'
						else:
							nick = after.nick
							tochange = 'Nickname'
						if self.bot.ishoisted(nick) and not decancered:
							num = after.discriminator
							dehoisted = True
							await after.edit(nick=f'John Doe {num}')
							logid = self.logchannels[after.guild.id] if after.guild.id in self.logchannels else None
							if logid:
								logch = after.guild.get_channel(logid['modlogs'])
							else:
								return
							if logch:
								embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
								embed.set_author(name=f'Auto-Dehoist | {after}', icon_url=str(after.avatar_url))
								embed.add_field(name='User', value=f'{after}({after.id})', inline=False)
								embed.add_field(name='Reason', value=f'{tochange} starts with a non A-Z character', inline=False)
								if tochange == 'Nickname':
									embed.add_field(name='Nickname', value=nick, inline=False)
								embed.set_footer(text=f'User ID: {after.id}')
								try:
									return await logch.send(embed=embed)
								except Exception:
									pass
			except Exception:
				pass
			logid = self.logchannels[after.guild.id] if after.guild.id in self.logchannels else None
			if logid:
				logch = after.guild.get_channel(logid['actionlogs'])
			else:
				return
			if logch:
				embed = discord.Embed(color=after.color, timestamp=datetime.datetime.utcnow(), description=f'{after.mention}\'**s nickname was changed**')
				embed.set_author(name=after, icon_url=str(after.avatar_url))
				embed.add_field(name='Before', value=before.nick, inline=False)
				embed.add_field(name='After', value=after.nick, inline=False)
				embed.set_footer(text=f"Author ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
		if before.roles != after.roles:
			logid = self.logchannels[after.guild.id] if after.guild.id in self.logchannels else None
			if logid:
				logch = after.guild.get_channel(logid['actionlogs'])
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
					joinedat = datetime.datetime.utcnow() - after.joined_at
					if joinedat < datetime.timedelta(minutes=1):
						return
					role = discord.utils.get(after.guild.roles, name=added[0])
					embed = discord.Embed(color=role.color, timestamp=datetime.datetime.utcnow(), description=f'{after.mention}\'s roles were changed\n**{after.name} was given the** {role.mention} **role**')
					embed.set_author(name=after, icon_url=str(after.avatar_url))
					embed.set_footer(text=f"Member ID: {after.id} | Role ID: {role.id}")
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
				if len(removed) == 1:
					role = discord.utils.get(after.guild.roles, name=removed[0])
					if role.id in self.deletedroles:
						return
					currentroles = await after.guild.fetch_roles()
					if role not in currentroles:
						self.bot.dispatch('guild_role_delete', role)
						self.deletedroles.append(role.id)
						return
					embed = discord.Embed(color=role.color, timestamp=datetime.datetime.utcnow(), description=f'{after.mention}\'s roles were changed\n**{after.name} was removed from the** {role.mention} **role**')
					embed.set_author(name=after, icon_url=str(after.avatar_url))
					embed.set_footer(text=f"Member ID: {after.id} | Role ID: {role.id}")
					try:
						await logch.send(embed=embed)
					except Exception:
						pass

	@commands.Cog.listener()
	async def on_guild_channel_pins_update(self, channel, last_pin = 0):
			logid = self.logchannels[channel.guild.id] if channel.guild.id in self.logchannels else None
			if logid:
				logch = channel.guild.get_channel(logid['actionlogs'])
			else:
				return
			if logch:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'{channel.mention}\'**s pinned messages were updated**')
				embed.set_author(name=channel.guild.name, icon_url=str(channel.guild.icon_url))
				embed.set_footer(text=f"Channel ID: {channel.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass

	@commands.Cog.listener()
	async def on_guild_role_create(self, role):
		logid = self.logchannels[role.guild.id] if role.guild.id in self.logchannels else None
		if logid:
			logch = role.guild.get_channel(logid['actionlogs'])
		else:
			return
		if logch:
			embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**A new role was created**\n{role.mention}')
			embed.set_author(name=role.guild.name, icon_url=str(role.guild.icon_url))
			embed.set_footer(text=f"Role ID: {role.id}")
			try:
				await logch.send(embed=embed)
			except Exception:
				pass

	@commands.Cog.listener()
	async def on_guild_role_delete(self, role):
		if role.id in self.deletedroles:
			return
		logid = self.logchannels[role.guild.id] if role.guild.id in self.logchannels else None
		if logid:
			logch = role.guild.get_channel(logid['actionlogs'])
		else:
			return
		if logch:
			embed = discord.Embed(color=role.color, timestamp=datetime.datetime.utcnow(), description=f'**The role** `{role.name}` **was deleted**')
			embed.set_author(name=role.guild.name, icon_url=str(role.guild.icon_url))
			embed.set_footer(text=f"Role ID: {role.id}")
			try:
				await logch.send(embed=embed)
			except Exception:
				pass

	@commands.Cog.listener()
	async def on_voice_state_update(self, member, before, after):
		logid = self.logchannels[member.guild.id] if member.guild.id in self.logchannels else None
		if logid:
			logch = member.guild.get_channel(logid['actionlogs'])
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
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
				elif not after.deaf:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **was server undeafened**')
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					if after.channel:
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed.set_footer(text=f"Member ID: {member.id}")
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
			if before.mute != after.mute:
				if after.mute:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **was server muted**')
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					if after.channel:
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed.set_footer(text=f"Member ID: {member.id}")
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
				elif not after.mute:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **was server unmuted**')
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					if after.channel:
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed.set_footer(text=f"Member ID: {member.id}")
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
			if before.self_video != after.self_video:
				if after.self_video:
					if after.channel:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **started sharing video in {after.channel.name}**')
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **started sharing video**')
						embed.set_footer(text=f"Member ID: {member.id}")
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
				elif not after.self_video:
					if after.channel:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **stopped sharing video in {after.channel.name}**')
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **stopped sharing video**')
						embed.set_footer(text=f"Member ID: {member.id}")
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
			if before.channel != after.channel:
				if before.channel and after.channel:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **switched voice channel**')
					embed.add_field(name='Before', value=before.channel.name, inline=False)
					embed.add_field(name='After', value=after.channel.name, inline=False)
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					embed.set_footer(text=f"Member ID: {member.id} | Old Channel ID: {before.channel.id} | New Channel ID: {after.channel.id}")
					try:
						return await logch.send(embed=embed)
					except Exception:
						pass
				if after.channel:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **joined voice channel {after.channel.name}**')
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					try:
						return await logch.send(embed=embed)
					except Exception:
						pass
				elif not after.channel:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **left voice channel {before.channel.name}**')
					embed.set_author(name=member, icon_url=str(member.avatar_url))
					embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {before.channel.id}")
					try:
						return await logch.send(embed=embed)
					except Exception:
						pass

	@commands.Cog.listener()
	async def on_guild_update(self, before, after):
		logid = self.logchannels[after.id] if after.id in self.logchannels else None
		if logid:
			logch = after.get_channel(logid['actionlogs'])
		else:
			return
		if logch:
			if before.name != after.name:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**Guild name was changed**')
				embed.add_field(name='Before', value=before.name, inline=False)
				embed.add_field(name='After', value=after.name, inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.region != after.region:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s region was changed**')
				embed.add_field(name='Before', value=region[str(before.region)], inline=False)
				embed.add_field(name='After', value=region[str(after.region)], inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.owner != after.owner:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name} was transferred to a new owner**')
				embed.add_field(name='Before', value=before.owner, inline=False)
				embed.add_field(name='After', value=after.owner, inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id} | Old Owner ID: {before.owner.id} | New Owner ID: {after.owner.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.verification_level != after.verification_level:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s verification level was changed**')
				embed.add_field(name='Before', value=str(before.verification_level).capitalize(), inline=False)
				embed.add_field(name='After', value=str(after.verification_level).capitalize(), inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.explicit_content_filter != after.explicit_content_filter:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s content filter level was changed**')
				embed.add_field(name='Before', value=str(before.explicit_content_filter).capitalize().replace('_', ''), inline=False)
				embed.add_field(name='After', value=str(after.explicit_content_filter).capitalize().replace('_', ''), inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.features != after.features:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s features were updated**')
				s = set(after.features)
				removed = [x for x in before.features if x not in s]
				s = set(before.features)
				added = [x for x in after.features if x not in s]
				if added:
					features = []
					for feature in added:
						features.append(f'> {feature}')
					embed.add_field(name='Added', value='\n'.join(features), inline=False)
				if removed:
					features = []
					for feature in removed:
						features.append(f'> {feature}')
					embed.add_field(name='Removed', value='\n'.join(features), inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.banner != after.banner:
				if after.banner:
					embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s banner was changed**')
					embed.set_image(url=str(after.banner_url))
				else:
					embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s banner was removed**')
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.splash != after.splash:
				if after.splash:
					embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s splash was changed**')
					embed.set_image(url=str(after.splash_url))
				else:
					embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s splash was removed**')
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.premium_tier != after.premium_tier:
				if after.premium_tier > before.premium_tier:
					embed = discord.Embed(color=discord.Color.from_rgb(255, 115, 250), timestamp=datetime.datetime.utcnow(), description=f'**{after.name} got boosted to Tier {after.premium_tier}**')
				if after.premium_tier < before.premium_tier:
					embed = discord.Embed(color=discord.Color.from_rgb(255, 115, 250), timestamp=datetime.datetime.utcnow(), description=f'**{after.name} got weakened to Tier {after.premium_tier}**')
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.system_channel != after.system_channel:
				if after.system_channel:
					embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s system channel was changed to {after.system_channel.mention}**')
				else:
					embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow(), description=f'**{after.name}\'s system channel was removed**')
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass

	@commands.Cog.listener()
	async def on_member_ban(self, guild, member):
		logid = self.logchannels[guild.id] if guild.id in self.logchannels else None
		if logid:
			logch = guild.get_channel(logid['actionlogs'])
		else:
			return
		if logch:
			embed = discord.Embed(color=member.color if member.color != discord.Color.default() else discord.Color.red(), timestamp=datetime.datetime.utcnow(), description=f'**{member.mention} was banned**')
			embed.set_author(name=member, icon_url=str(member.avatar_url))
			embed.set_footer(text=f"Member ID: {member.id}")
			try:
				await logch.send(embed=embed)
			except Exception:
				pass

	@commands.Cog.listener()
	async def on_member_unban(self, guild, member):
		logid = self.logchannels[guild.id] if guild.id in self.logchannels else None
		if logid:
			logch = guild.get_channel(logid['actionlogs'])
		else:
			return
		if logch:
			embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow(), description=f'**{member} was unbanned**')
			embed.set_author(name=member, icon_url=str(member.avatar_url))
			embed.set_footer(text=f"Member ID: {member.id}")
			try:
				await logch.send(embed=embed)
			except Exception:
				pass

	@commands.command(name='settings', aliases=['setup'], description='Configure my settings')
	@commands.has_permissions(manage_guild=True)
	@commands.bot_has_permissions(add_reactions=True, external_emojis=True)
	@commands.guild_only()
	async def gsettings(self, ctx):
		'''PFXsettings'''
		firesuccess = discord.utils.get(self.bot.emojis, id=603214443442077708)
		firefailed = discord.utils.get(self.bot.emojis, id=603214400748257302)
		settingslist = {
			'modlogs': 'Disabled',
			'actionlogs': 'Disabled',
			'invfilter': 'Disabled',
			'globalbans': 'Disabled',
			'autodecancer': 'Disabled',
			'autodehoist': 'Disabled'
		}
		await ctx.send('Hey, I\'m going to guide you through my settings. This shouldn\'t take long, there\'s only 6 options to configure')
		await asyncio.sleep(3)
		await ctx.send('First, we\'ll configure logging. Please give a channel for moderation logs or say `skip` to disable...')

		def modlog_check(message):
			if message.author != ctx.author:
				return False
			else:
				return True
		try:
			modlogchannel = None
			modlogsmsg = await self.bot.wait_for('message', timeout=30.0, check=modlog_check)
			if modlogsmsg.content != 'skip':
				try:
					modlogchannel = await TextChannel().convert(ctx, modlogsmsg.content)
					modlognotfound = False
					settingslist['modlogs'] = modlogchannel.id
				except commands.BadArgument:
					modlognotfound = True
				modlogs = settingslist['modlogs']
				if modlogs == 'Disabled':
					modlogs = 0
					if modlognotfound:
						await ctx.send('I couldn\'t find that channel, disabling actimodon logs')
					else:
						await ctx.send('Disabling mod logs...')
				else:
					await ctx.send(f'Great! Setting mod logs to {modlogchannel.mention}')
			else:
				await ctx.send('Skipping mod logs...')
			con = await self.bot.db.acquire()
			async with con.transaction():
				q = 'UPDATE settings SET modlogs = $1 WHERE gid = $2;'
				await self.bot.db.execute(q, modlogs, ctx.guild.id)
			await self.bot.db.release(con)
		except asyncio.TimeoutError:
			return await ctx.send(f'{ctx.author.mention}, you took too long. Stopping setup!')
		await asyncio.sleep(2)
		await ctx.send('Ok. Next we\'ll configure action logs. This is where actions such as deleted messages, edited messages etc. are logged.')
		await asyncio.sleep(2)
		await ctx.send('Please give a channel for action logs or say `skip` to disable...')
		def actionlog_check(message):
			if message.author != ctx.author:
				return False
			else:
				return True
		try:
			actionlogchannel = None
			actionlogmsg = await self.bot.wait_for('message', timeout=30.0, check=actionlog_check)
			if actionlogmsg.content != 'skip':
				try:
					actionlogchannel = await TextChannel().convert(ctx, actionlogmsg.content)
					actionlognotfound = False
					settingslist['actionlogs'] = actionlogchannel.id
				except commands.BadArgument:
					actionlognotfound = True
				actionlogs = settingslist['actionlogs']
				if actionlogs == 'Disabled':
					actionlogs = 0
					if actionlognotfound:
						await ctx.send('I couldn\'t find that channel, disabling action logs')
					else:
						await ctx.send('Disabling action logs...')
				else:
					await ctx.send(f'Great! Setting action logs to {actionlogchannel.mention}')
			else:
				await ctx.send('Skipping action logs...')
			con = await self.bot.db.acquire()
			async with con.transaction():
				q = 'UPDATE settings SET actionlogs = $1 WHERE gid = $2;'
				await self.bot.db.execute(q, actionlogs, ctx.guild.id)
			await self.bot.db.release(con)
		except asyncio.TimeoutError:
			await self.loadSettings()
			return await ctx.send(f'{ctx.author.mention}, you took too long. Stopping setup!')
		await asyncio.sleep(2)
		await ctx.send('Ok. Next is invite filtering. If a user attempts to send an discord invite, I will delete it (that is, if I have permission to do so)')
		await asyncio.sleep(2)
		invfiltermsg = await ctx.send(f'React with {firesuccess} to enable and {firefailed} to disable')
		await invfiltermsg.add_reaction(firesuccess)
		await invfiltermsg.add_reaction(firefailed)
		def invfilter_check(reaction, user):
			if user != ctx.author:
				return False
			if reaction.emoji == firefailed and reaction.message.id == invfiltermsg.id:
				return True
			if reaction.emoji == firesuccess and reaction.message.id == invfiltermsg.id:
				settingslist['invfilter'] = 'Enabled'
				return True
		try:
			await self.bot.wait_for('reaction_add', timeout=30.0, check=invfilter_check)
			invfilter = settingslist['invfilter']
			if invfilter == 'Disabled':
				invfilter = 0
				await ctx.send('Disabling invite filter...')
			elif invfilter == 'Enabled':
				invfilter = 1
				await ctx.send(f'Great! I\'ll enable invite filtering!')
			con = await self.bot.db.acquire()
			async with con.transaction():
				q = 'UPDATE settings SET inviteblock = $1 WHERE gid = $2;'
				await self.bot.db.execute(q, invfilter, ctx.guild.id)
			await self.bot.db.release(con)
		except asyncio.TimeoutError:
			await self.loadSettings()
			return await ctx.send(f'{ctx.author.mention}, you took too long. Stopping setup!')
		await asyncio.sleep(2)
		await ctx.send('Ok. Now we\'re onto global bans. Fire uses the KSoft.Si API to check for naughty people. If enabled, I will ban any of these naughty people if they attempt to join.')
		await asyncio.sleep(2)
		gbansmsg = await ctx.send(f'React with {firesuccess} to enable and {firefailed} to disable')
		await gbansmsg.add_reaction(firesuccess)
		await gbansmsg.add_reaction(firefailed)
		def gban_check(reaction, user):
			if user != ctx.author:
				return False
			if reaction.emoji == firefailed and reaction.message.id == gbansmsg.id:
				return True
			if reaction.emoji == firesuccess and reaction.message.id == gbansmsg.id:
				settingslist['globalbans'] = 'Enabled'
				return True
		try:
			await self.bot.wait_for('reaction_add', timeout=30.0, check=gban_check)
			gbans = settingslist['globalbans']
			if gbans == 'Disabled':
				gbans = 0
				await ctx.send('Disabling global bans...')
			elif gbans == 'Enabled':
				gbans = 1
				await ctx.send(f'Great! I\'ll enable global bans!')
			con = await self.bot.db.acquire()
			async with con.transaction():
				q = 'UPDATE settings SET globalbans = $1 WHERE gid = $2;'
				await self.bot.db.execute(q, gbans, ctx.guild.id)
			await self.bot.db.release(con)
		except asyncio.TimeoutError:
			await self.loadSettings()
			return await ctx.send(f'{ctx.author.mention}, you took too long. Stopping setup!')
		await asyncio.sleep(2)
		await ctx.send('The penultimate setting, auto-decancer. No, this setting doesn\'t cure cancer. Instead, it renames users with "cancerous" names (non-ascii) to some form of `John Doe 0000`')
		await asyncio.sleep(2)
		autodcmsg = await ctx.send(f'React with {firesuccess} to enable and {firefailed} to disable')
		await autodcmsg.add_reaction(firesuccess)
		await autodcmsg.add_reaction(firefailed)
		def dc_check(reaction, user):
			if user != ctx.author:
				return False
			if reaction.emoji == firefailed and reaction.message.id == autodcmsg.id:
				return True
			if reaction.emoji == firesuccess and reaction.message.id == autodcmsg.id:
				settingslist['autodecancer'] = 'Enabled'
				return True
		try:
			await self.bot.wait_for('reaction_add', timeout=30.0, check=dc_check)
			decancer = settingslist['autodecancer']
			if decancer == 'Disabled':
				decancer = 0
				await ctx.send('Disabling auto-decancer...')
			elif decancer == 'Enabled':
				decancer = 1
				await ctx.send(f'Great! I\'ll enable auto-decancer!')
			con = await self.bot.db.acquire()
			async with con.transaction():
				q = 'UPDATE settings SET autodecancer = $1 WHERE gid = $2;'
				await self.bot.db.execute(q, decancer, ctx.guild.id)
			await self.bot.db.release(con)
		except asyncio.TimeoutError:
			await self.loadSettings()
			return await ctx.send(f'{ctx.author.mention}, you took too long. Stopping setup!')
		await asyncio.sleep(2)
		await ctx.send('Finally, the last setting. Similar to the last one, auto-dehoist renames people with a non A-Z character at the start of their name.')
		await asyncio.sleep(2)
		autodhmsg = await ctx.send(f'React with {firesuccess} to enable and {firefailed} to disable')
		await autodhmsg.add_reaction(firesuccess)
		await autodhmsg.add_reaction(firefailed)
		def dh_check(reaction, user):
			if user != ctx.author:
				return False
			if reaction.emoji == firefailed and reaction.message.id == autodhmsg.id:
				return True
			if reaction.emoji == firesuccess and reaction.message.id == autodhmsg.id:
				settingslist['autodehoist'] = 'Enabled'
				return True
		try:
			await self.bot.wait_for('reaction_add', timeout=30.0, check=dh_check)
			dehoist = settingslist['autodehoist']
			if dehoist == 'Disabled':
				dehoist = 0
				await ctx.send('Disabling auto-dehoist...')
			elif dehoist == 'Enabled':
				dehoist = 1
				await ctx.send(f'Great! I\'ll enable auto-dehoist!')
			con = await self.bot.db.acquire()
			async with con.transaction():
				q = 'UPDATE settings SET autodehoist = $1 WHERE gid = $2;'
				await self.bot.db.execute(q, dehoist, ctx.guild.id)
			await self.bot.db.release(con)
		except asyncio.TimeoutError:
			await self.loadSettings()
			return await ctx.send(f'{ctx.author.mention}, you took too long. Stopping setup!')
		await asyncio.sleep(2)
		await ctx.send('Nice! We\'re all good to go. I\'ll send a recap in a moment. I just need to reload settings.')
		await self.loadSettings()
		embed = discord.Embed(title=":gear: Guild Settings", colour=ctx.author.color, description="Here's a list of the current guild settings", timestamp=datetime.datetime.utcnow())
		embed.set_author(name=ctx.guild.name, icon_url=str(ctx.guild.icon_url))
		if modlogchannel:
			modlogs = modlogchannel.mention
		else:
			modlogs = 'Disabled'
		if actionlogchannel:
			actionlogs = actionlogchannel.mention
		else:
			actionlogs = 'Disabled'
		embed.add_field(name="Moderation Logs", value=modlogs, inline=False)
		embed.add_field(name="Action Logs", value=actionlogs, inline=False)
		embed.add_field(name="Invite Filter", value=settingslist['invfilter'], inline=False)
		embed.add_field(name="Global Ban Check (KSoft.Si API)", value=settingslist['globalbans'], inline=False)
		embed.add_field(name="Auto-Decancer", value=settingslist['autodecancer'], inline=False)
		embed.add_field(name="Auto-Dehoist", value=settingslist['autodehoist'], inline=False)
		await ctx.send(embed=embed)

	@commands.command(name='setlogs', aliases=['logging', 'log', 'logs'])
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def settings_logs(self, ctx, newlog: typing.Union[TextChannel, int] = None):
		'''PFXsetlogs <channel>'''
		if newlog == None:
			# raise commands.UserInputError('Missing argument! Provide a channel for me to send logs to or 0 to disable logging')
			con = await self.bot.db.acquire()
			async with con.transaction():
				mquery = 'UPDATE settings SET modlogs = 0 WHERE gid = $1;'
				await self.bot.db.execute(mquery, ctx.guild.id)
				aquery = 'UPDATE settings SET actionlogs = 0 WHERE gid = $1;'
				await self.bot.db.execute(aquery, ctx.guild.id)
			await self.bot.db.release(con)
			await ctx.send(f'Successfully disabled logging in {discord.utils.escape_mentions(ctx.guild.name)}', delete_after=5)
			await self.loadSettings()
		elif newlog == 0:
			# await self.bot.db.execute(f'UPDATE settings SET logging = 0 WHERE gid = {ctx.guild.id}')
			# await self.bot.conn.commit()
			con = await self.bot.db.acquire()
			async with con.transaction():
				mquery = 'UPDATE settings SET modlogs = 0 WHERE gid = $1;'
				await self.bot.db.execute(mquery, ctx.guild.id)
				aquery = 'UPDATE settings SET actionlogs = 0 WHERE gid = $1;'
				await self.bot.db.execute(aquery, ctx.guild.id)
			await self.bot.db.release(con)
			await ctx.send(f'Successfully disabled logging in {discord.utils.escape_mentions(ctx.guild.name)}', delete_after=5)
			await self.loadSettings()
		else:
			if type(newlog) == int:
				channel = self.bot.get_channel(newlog)
				if channel == None:
					await ctx.send(f'Invalid channel ID provided! Use `0` to disable or provide a valid channel')
					return
				# await self.bot.db.execute(f'UPDATE settings SET logging = {newlog} WHERE gid = {ctx.guild.id}')
				# await self.bot.conn.commit()
				con = await self.bot.db.acquire()
				async with con.transaction():
					mquery = 'UPDATE settings SET modlogs = $1 WHERE gid = $2;'
					await self.bot.db.execute(mquery, newlog, ctx.guild.id)
					aquery = 'UPDATE settings SET actionlogs = $1 WHERE gid = $2;'
					await self.bot.db.execute(aquery, newlog, ctx.guild.id)
				await self.bot.db.release(con)
				await self.loadSettings()
				await ctx.send(f'Updated logs setting.')
			elif type(newlog) == discord.TextChannel:
				try:
					self.bot.get_channel(newlog.id)
				except discord.NotFound:
					await ctx.send(f'Invalid channel provided! Use `0` to disable or provide a valid channel')
					return
				# await self.bot.db.execute(f'UPDATE settings SET logging = {newlog.id} WHERE gid = {ctx.guild.id}')
				# await self.bot.conn.commit()
				con = await self.bot.db.acquire()
				async with con.transaction():
					mquery = 'UPDATE settings SET modlogs = $1 WHERE gid = $2;'
					await self.bot.db.execute(mquery, newlog.id, ctx.guild.id)
					aquery = 'UPDATE settings SET actionlogs = $1 WHERE gid = $2;'
					await self.bot.db.execute(aquery, newlog.id, ctx.guild.id)
				await self.bot.db.release(con)
				await self.loadSettings()
				await ctx.send(f'Successfully enabled logging in {newlog.mention}', delete_after=5)

	@commands.command(name='modonly', description='Set channels to be moderator only (users with `Manage Messages` are moderators')
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def modonly(self, ctx, channels: commands.Greedy[TextChannel] = None):
		if not channels:
			con = await self.bot.db.acquire()
			async with con.transaction():
				mquery = 'UPDATE settings SET modonly = $1 WHERE gid = $2;'
				await self.bot.db.execute(mquery, [], ctx.guild.id)
			await self.bot.db.release(con)
			await self.loadSettings()
			return await ctx.send(f'I\'ve reset the mod only channels. Commands can now be executed in any channels.')
		else:
			channelids = [c.id for c in channels]
			con = await self.bot.db.acquire()
			async with con.transaction():
				mquery = 'UPDATE settings SET modonly = $1 WHERE gid = $2;'
				await self.bot.db.execute(mquery, channelids, ctx.guild.id)
			await self.bot.db.release(con)
			await self.loadSettings()
			channelmentions = [c.mention for c in channels]
			channellist = ', '.join(channelmentions)
			return await ctx.send(f'Commands can now only be run by moderators in {channellist}.')

	@commands.command(name='adminonly', description='Set channels to be admin only (users with `Manage Server` are admins')
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def adminonly(self, ctx, channels: commands.Greedy[TextChannel] = None):
		if not channels:
			con = await self.bot.db.acquire()
			async with con.transaction():
				mquery = 'UPDATE settings SET adminonly = $1 WHERE gid = $2;'
				await self.bot.db.execute(mquery, [], ctx.guild.id)
			await self.bot.db.release(con)
			await self.loadSettings()
			return await ctx.send(f'I\'ve reset the admin only channels. Commands can now be executed in any channels.')
		else:
			channelids = [c.id for c in channels]
			con = await self.bot.db.acquire()
			async with con.transaction():
				mquery = 'UPDATE settings SET adminonly = $1 WHERE gid = $2;'
				await self.bot.db.execute(mquery, channelids, ctx.guild.id)
			await self.bot.db.release(con)
			await self.loadSettings()
			channelmentions = [c.mention for c in channels]
			channellist = ', '.join(channelmentions)
			return await ctx.send(f'Commands can now only be run by admins in {channellist}.')	


def setup(bot):
	bot.add_cog(settings(bot))