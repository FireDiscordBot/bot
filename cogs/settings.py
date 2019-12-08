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
import re
from random import randint
from fire.converters import TextChannel, Role, Member
from fire.invite import findinvite
from fire.youtube import findchannel, findvideo
from fire.paypal import findpaypal
from fire.twitch import findtwitch
from fire.twitter import findtwitter

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

watchedcmds = ['purge']
region = {
	'amsterdam': '🇳🇱 Amsterdam',
	'brazil': '🇧🇷 Brazil',
	'eu-central': '🇪🇺 Central Europe',
	'eu-west': '🇪🇺 Western Europe',
	'europe': '🇪🇺 Europe',
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
		self.linkfilter = {}
		self.filterexcl = {}
		self.malware = []
		self.gbancheck = []
		self.recentgban = []
		self.autodecancer = []
		self.autodehoist = []
		self.modonly = {}
		self.adminonly = {}
		self.joinleave = {}
		self.antiraid = {}
		self.raidmsgs = {}
		self.msgraiders = {}
		self.joincache = {}
		self.dupecheck = {}
		self.disabledcmds = {}
		self.uuidregex = r"[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}"
		if not hasattr(self.bot, 'invites'):
			self.bot.invites = {}

	def clean(self, text: str):
		return re.sub(r'[^A-Za-z0-9.\/ ]', '', text, 0, re.MULTILINE)

	async def loadSettings(self):
		self.logchannels = {}
		self.linkfilter = {}
		self.filterexcl = {}
		self.malware = []
		self.gbancheck = []
		self.recentgban = []
		self.autodecancer = []
		self.autodehoist = []
		self.modonly = {}
		self.adminonly = {}
		self.joinleave = {}
		self.antiraid = {}
		self.raidmsgs = {}
		self.msgraiders = {}
		self.joincache = {}
		self.dupecheck = {}
		self.dupecheck['guilds'] = []
		self.disabledcmds = {}
		for g in self.bot.guilds:
			self.joincache[g.id] = []
			self.raidmsgs[g.id] = None
			self.msgraiders[g.id] = []
			self.disabledcmds[g.id] = []
		query = 'SELECT * FROM settings;'
		settings = await self.bot.db.fetch(query)
		for s in settings:
			guild = s['gid']
			if s['filterexcl']:
				self.filterexcl[guild] = s['filterexcl']
			if s['disabledcmds']:
				self.disabledcmds[guild] = s['disabledcmds']
			if s['globalbans'] == 1:
				self.gbancheck.append(guild)
			if s['autodecancer'] == 1:
				self.autodecancer.append(guild)
			if s['autodehoist'] == 1:
				self.autodehoist.append(guild)
			if s['dupecheck'] == 1:
				self.dupecheck['guilds'].append(guild)
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
			if s['antiraid'] == 0:
				antiraid = False
			else:
				antiraid = s['antiraid']
			guildobj = self.bot.get_guild(guild)
			if not guildobj:
				modlogs = False
				actionlogs = False
				antiraid = False
			else:
				if modlogs:
					cmodlogs = discord.utils.get(guildobj.channels, id=modlogs)
					if type(cmodlogs) != discord.TextChannel:
						modlogs = False
				if actionlogs:
					cactionlogs = discord.utils.get(guildobj.channels, id=actionlogs)
					if type(cactionlogs) != discord.TextChannel:
						actionlogs = False
				if antiraid:
					cantiraid = discord.utils.get(guildobj.channels, id=antiraid)
					if type(cantiraid) != discord.TextChannel:
						antiraid = False
			self.logchannels[guild] = {
				"modlogs": modlogs,
				"actionlogs": actionlogs
			}
			if antiraid:
				self.antiraid[guild] = antiraid
		query = 'SELECT * FROM joinleave;'
		joinleave = await self.bot.db.fetch(query)
		for jl in joinleave:
			guild = jl['gid']
			self.joinleave[guild] = {
				'joinchan': jl.get('joinchan', False),
				'leavechan': jl.get('leavechan', False),
				'joinmsg': jl.get('joinmsg', False),
				'leavemsg': jl.get('leavemsg', False)
			}
		query = 'SELECT * FROM linkfilter;'
		filtered = await self.bot.db.fetch(query)
		for f in filtered:
			guild = f['gid']
			self.linkfilter[guild] = f['enabled'] or []
		malware = await aiohttp.ClientSession().get('https://mirror.cedia.org.ec/malwaredomains/justdomains')
		malware = await malware.text()
		self.malware = list(filter(None, malware.split('\n')))

	async def loadInvites(self, gid: int = None):
		if not gid:
			self.bot.invites = {}
			for guild in self.bot.guilds:
				invites = []
				try:
					invites = await guild.invites()
					if 'VANITY_URL' in guild.features:
						vanity = await guild.vanity_invite()
						invites.append(vanity)
				except (discord.Forbidden, discord.HTTPException) as e:
					if isinstance(e, discord.Forbidden):
						continue
					if isinstance(e, discord.HTTPException) and invites == []:
						continue
				self.bot.invites[guild.id] = {}
				for invite in invites:
					self.bot.invites[guild.id][invite.code] = invite.uses
		else:
			self.bot.invites[gid] = {}
			guild = self.bot.get_guild(gid)
			if guild:
				invites = []
				try:
					invites = await guild.invites()
					if 'VANITY_URL' in guild.features:
						vanity = await guild.vanity_invite()
						invites.append(vanity)
				except (discord.Forbidden, discord.HTTPException) as e:
					if isinstance(e, discord.Forbidden):
						return
					if isinstance(e, discord.HTTPException) and invites == []:
						return
				self.bot.invites[guild.id] = {}
				for invite in invites:
					self.bot.invites[guild.id][invite.code] = invite.uses

	@commands.Cog.listener()
	async def on_ready(self):
		self.bot.ksoft.register_ban_hook(self.ksoft_ban_hook)
		await self.loadSettings()
		await self.loadInvites()

	@commands.command(name='loadsettings', description='Load settings', hidden=True)
	async def loadthesettings(self, ctx):
		'''PFXloadsettings'''
		if await self.bot.is_team_owner(ctx.author):
			await self.loadSettings()
			await ctx.send('Loaded data!')
		else:
			await ctx.send('no.')

	async def getvanitys(self):
		if not self.bot.dev:
			return self.bot.vanity_urls
		async with aiohttp.ClientSession() as s:
			async with s.get(config['vanityurlapi']) as r:
				vanity_urls = await r.json()
		return vanity_urls

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
		if type(after.author) != discord.Member:
			return
		if after.channel.type == discord.ChannelType.news and after.author.permissions_in(after.channel).manage_messages:
			raw = await self.bot.http.get_message(after.channel.id, after.id)
			if raw.get('flags') == 1:
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
						await logch.send(embed=embed)
					except Exception:
						pass
		if before.content == after.content:
			return
		message = after
		# cleaned = self.clean(message.system_content)
		excluded = self.filterexcl.get(message.guild.id, [])
		roleids = [r.id for r in message.author.roles]
		if message.author.id not in excluded and not any(r in excluded for r in roleids) and message.channel.id not in excluded:
			if any(l in message.system_content for l in self.malware):
				if isinstance(message.author, discord.Member):
					if 'malware' in self.linkfilter.get(message.guild.id, []):
						try:
							await message.delete()
						except Exception:
							try:
								await message.channel.send(f'A blacklisted link was found in a message send by {message.author} and I was unable to delete it!')
							except Exception:
								pass
			code = findinvite(message.system_content)
			invite = None
			nodel = False
			if code:
				invalidinvite = False
				if isinstance(message.author, discord.Member):
					if not message.author.permissions_in(message.channel).manage_messages:
						if message.guild.me.permissions_in(message.channel).manage_messages:
							if 'discord' in self.linkfilter.get(message.guild.id, []):
								try:
									invite = await self.bot.fetch_invite(url=code)
									if invite.guild.id == message.guild.id:
										nodel = True
								except Exception:
									pass
								if not nodel:
									try:
										await message.delete()
									except Exception:
										pass
				try:
					ohmygod = False
					self.bot.vanity_urls = await self.getvanitys()
					if code.lower() in self.bot.vanity_urls and 'oh-my-god.wtf' in message.system_content:
						invite = self.bot.getvanity(code)
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
							if isinstance(invite, dict):
								invite = await self.bot.fetch_invite(url=invite['invite'])
							embed.add_field(name='Invite Code', value=code, inline=False)
							if isinstance(invite, discord.Invite):
								embed.add_field(name='Guild', value=f'{invite.guild.name}({invite.guild.id})', inline=False)
								embed.add_field(name='Channel', value=f'#{invite.channel.name}({invite.channel.id})', inline=False)
								embed.add_field(name='Members', value=f'{invite.approximate_member_count} ({invite.approximate_presence_count} active)', inline=False)
								embed.set_footer(text=f"Author ID: {message.author.id}")
							try:
								await logch.send(embed=embed)
							except Exception:
								pass
			paypal = findpaypal(message.system_content)
			if paypal:
				if isinstance(message.author, discord.Member):
					if not message.author.permissions_in(message.channel).manage_messages:
						if message.guild.me.permissions_in(message.channel).manage_messages:
							if 'paypal' in self.linkfilter.get(message.guild.id, []):
								try:
									await message.delete()
								except Exception:
									pass
				if message.guild:
					if message.author.bot:
						return
					logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
					if logid:
						logch = message.guild.get_channel(logid['actionlogs'])
					else:
						return
					if logch:
						embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**PayPal link sent in** {message.channel.mention}')
						embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
						embed.add_field(name='Link', value=f'[{paypal}](https://paypal.me/{paypal})', inline=False)
						embed.set_footer(text=f"Author ID: {message.author.id}")
						try:
							await logch.send(embed=embed)
						except Exception:
							pass
			ytcog = self.bot.get_cog('YouTube API')
			video = findvideo(message.system_content)
			channel = findchannel(message.system_content)
			invalidvid = False
			invalidchannel = False
			if video:
				if isinstance(message.author, discord.Member):
					if not message.author.permissions_in(message.channel).manage_messages:
						if message.guild.me.permissions_in(message.channel).manage_messages:
							if 'youtube' in self.linkfilter.get(message.guild.id, []):
								try:
									await message.delete()
								except Exception:
									pass
				videoinfo = await self.bot.loop.run_in_executor(None, func=functools.partial(ytcog.video_info, video))
				videoinfo = videoinfo.get('items', [])
				if len(videoinfo) < 1:
					pass
				else:
					videoinfo = videoinfo[0]
					if message.guild:
						if message.author.bot:
							return
						logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
						if logid:
							logch = message.guild.get_channel(logid['actionlogs'])
						else:
							return
						if logch:
							embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**YouTube video sent in** {message.channel.mention}')
							embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
							embed.add_field(name='Video ID', value=video, inline=False)
							if not invalidvid:
								embed.add_field(name='Title', value=f'[{videoinfo.get("snippet", {}).get("title", "Unknown")}](https://youtu.be/{video})', inline=False)
								embed.add_field(name='Channel', value=f'[{videoinfo.get("snippet", {}).get("channelTitle", "Unknown")}](https://youtube.com/channel/{videoinfo.get("snippet", {}).get("channelId", "Unknown")})', inline=False)
								views = format(int(videoinfo['statistics'].get('viewCount', 0)), ',d')
								likes = format(int(videoinfo['statistics'].get('likeCount', 0)), ',d')
								dislikes = format(int(videoinfo['statistics'].get('dislikeCount', 0)), ',d')
								comments = format(int(videoinfo['statistics'].get('commentCount', 0)), ',d')
								embed.add_field(name='Stats', value=f'{views} views, {likes} likes, {dislikes} dislikes, {comments} comments', inline=False)
							embed.set_footer(text=f"Author ID: {message.author.id}")
							try:
								await logch.send(embed=embed)
							except Exception:
								pass
			if channel:
				if isinstance(message.author, discord.Member):
					if not message.author.permissions_in(message.channel).manage_messages:
						if message.guild.me.permissions_in(message.channel).manage_messages:
							if 'youtube' in self.linkfilter.get(message.guild.id, []):
								try:
									await message.delete()
								except Exception:
									pass
				channelinfo = await self.bot.loop.run_in_executor(None, func=functools.partial(ytcog.channel_info, channel))
				channelinfo = channelinfo.get('items', [])
				if len(channelinfo) < 1:
					pass
				else:
					channelinfo = channelinfo[0]
					if message.guild:
						if message.author.bot:
							return
						logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
						if logid:
							logch = message.guild.get_channel(logid['actionlogs'])
						else:
							return
						if logch:
							embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**YouTube channel sent in** {message.channel.mention}')
							embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
							if invalidchannel:
								embed.add_field(name='Channel', value=f'https://youtube.com/channel/{channel}')
								embed.add_field(name='More Info', value=f'I was unable to find info about this channel.', inline=False)
							else:
								embed.add_field(name='Name', value=f'{channelinfo.get("snippet", {}).get("title", "Unknown")}', inline=False)
								embed.add_field(name='Channel', value=f'https://youtube.com/channel/{channel}')
								embed.add_field(name='Custom URL', value=f'https://youtube.com/{channelinfo.get("snippet", {}).get("customUrl", "N/A")}', inline=False)
								subs = format(int(channelinfo['statistics'].get('subscriberCount', 0)), ',d') if not channelinfo['statistics'].get('hiddenSubscriberCount', False) else 'Hidden'
								views = format(int(channelinfo['statistics'].get('viewCount', 0)), ',d')
								videos = format(int(channelinfo['statistics'].get('videoCount', 0)), ',d')
								embed.add_field(name='Stats', value=f'{subs} subscribers, {views} total views, {videos} videos', inline=False)
							embed.set_footer(text=f"Author ID: {message.author.id}")
							try:
								await logch.send(embed=embed)
							except Exception:
								pass
			twitch = findtwitch(message.system_content)
			if twitch:
				if isinstance(message.author, discord.Member):
					if not message.author.permissions_in(message.channel).manage_messages:
						if message.guild.me.permissions_in(message.channel).manage_messages:
							if 'twitch' in self.linkfilter.get(message.guild.id, []):
								try:
									await message.delete()
								except Exception:
									pass
				if message.guild:
					if message.author.bot:
						return
					logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
					if logid:
						logch = message.guild.get_channel(logid['actionlogs'])
					else:
						return
					if logch:
						embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**Twitch link sent in** {message.channel.mention}')
						embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
						embed.add_field(name='Link', value=f'[{twitch}](https://twitch.tv/{twitch})', inline=False)
						embed.set_footer(text=f"Author ID: {message.author.id}")
						try:
							await logch.send(embed=embed)
						except Exception:
							pass
			twitter = findtwitter(message.system_content)
			if twitter:
				if isinstance(message.author, discord.Member):
					if not message.author.permissions_in(message.channel).manage_messages:
						if message.guild.me.permissions_in(message.channel).manage_messages:
							if 'twitter' in self.linkfilter.get(message.guild.id, []):
								try:
									await message.delete()
								except Exception:
									pass
				if message.guild:
					if message.author.bot:
						return
					logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
					if logid:
						logch = message.guild.get_channel(logid['actionlogs'])
					else:
						return
					if logch:
						embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**Twitter link sent in** {message.channel.mention}')
						embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
						embed.add_field(name='Link', value=f'[{twitter}](https://twitter.com/{twitter})', inline=False)
						embed.set_footer(text=f"Author ID: {message.author.id}")
						try:
							await logch.send(embed=embed)
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

	def uuidgobyebye(self, text: str):
		return re.sub(self.uuidregex, '', text, 0, re.MULTILINE)

	@commands.Cog.listener()
	async def on_message(self, message):
		if type(message.author) != discord.Member:
			return
		lastmsg = self.uuidgobyebye(self.dupecheck.get(message.author.id, 'send this message and it will get yeeted'))
		thismsg = self.uuidgobyebye(message.content)
		if message.content != "" and len(message.attachments) < 1 and not message.author.bot:
			if message.content == lastmsg and message.guild.id in self.dupecheck['guilds'] and not message.author.permissions_in(message.channel).manage_messages:
				await message.delete()
		self.dupecheck[message.author.id] = message.content
		premium = self.bot.get_cog('Premium Commands').premiumGuilds
		if message.guild and message.guild.id in premium:
			raidmsg = self.raidmsgs.get(message.guild.id, False)
			if raidmsg and raidmsg in message.content:
				self.msgraiders.get(message.guild.id, []).append(message.author)
		excluded = self.filterexcl.get(message.guild.id, [])
		roleids = [r.id for r in message.author.roles]
		if message.author.id not in excluded and not any(r in excluded for r in roleids) and message.channel.id not in excluded:
			if any(l in message.system_content for l in self.malware):
				if isinstance(message.author, discord.Member):
					if 'malware' in self.linkfilter.get(message.guild.id, []):
						try:
							await message.delete()
						except Exception:
							try:
								await message.channel.send(f'A blacklisted link was found in a message send by {message.author} and I was unable to delete it!')
							except Exception:
								pass
			code = findinvite(message.system_content)
			invite = None
			nodel = False
			if code:
				invalidinvite = False
				if isinstance(message.author, discord.Member):
					if not message.author.permissions_in(message.channel).manage_messages:
						if message.guild.me.permissions_in(message.channel).manage_messages:
							if 'discord' in self.linkfilter.get(message.guild.id, []):
								try:
									invite = await self.bot.fetch_invite(url=code)
									if invite.guild.id == message.guild.id:
										nodel = True
								except Exception:
									pass
								if not nodel:
									try:
										await message.delete()
									except Exception:
										pass
				try:
					ohmygod = False
					self.bot.vanity_urls = await self.getvanitys()
					if code.lower() in self.bot.vanity_urls and 'oh-my-god.wtf' in message.system_content:
						invite = self.bot.getvanity(code)
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
						if isinstance(invite, dict):
							invite = await self.bot.fetch_invite(url=invite['invite'])
						embed.add_field(name='Invite Code', value=code, inline=False)
						if isinstance(invite, discord.Invite):
							embed.add_field(name='Guild', value=f'{invite.guild.name}({invite.guild.id})', inline=False)
							embed.add_field(name='Channel', value=f'#{invite.channel.name}({invite.channel.id})', inline=False)
							embed.add_field(name='Members', value=f'{invite.approximate_member_count} ({invite.approximate_presence_count} active)', inline=False)
							embed.set_footer(text=f"Author ID: {message.author.id}")
						try:
							await logch.send(embed=embed)
						except Exception:
							pass
			paypal = findpaypal(message.system_content)
			if paypal:
				if isinstance(message.author, discord.Member):
					if not message.author.permissions_in(message.channel).manage_messages:
						if message.guild.me.permissions_in(message.channel).manage_messages:
							if 'paypal' in self.linkfilter.get(message.guild.id, []):
								try:
									await message.delete()
								except Exception:
									pass
				if message.guild:
					if message.author.bot:
						return
					logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
					if logid:
						logch = message.guild.get_channel(logid['actionlogs'])
					else:
						return
					if logch:
						embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**PayPal link sent in** {message.channel.mention}')
						embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
						embed.add_field(name='Link', value=f'[{paypal}](https://paypal.me/{paypal})', inline=False)
						embed.set_footer(text=f"Author ID: {message.author.id}")
						try:
							await logch.send(embed=embed)
						except Exception:
							pass
			ytcog = self.bot.get_cog('YouTube API')
			video = findvideo(message.system_content)
			channel = findchannel(message.system_content)
			invalidvid = False
			invalidchannel = False
			if video:
				if isinstance(message.author, discord.Member):
					if not message.author.permissions_in(message.channel).manage_messages:
						if message.guild.me.permissions_in(message.channel).manage_messages:
							if 'youtube' in self.linkfilter.get(message.guild.id, []):
								try:
									await message.delete()
								except Exception:
									pass
				videoinfo = await self.bot.loop.run_in_executor(None, func=functools.partial(ytcog.video_info, video))
				videoinfo = videoinfo.get('items', [])
				if len(videoinfo) < 1:
					pass
				else:
					videoinfo = videoinfo[0]
					if message.guild:
						if message.author.bot:
							return
						logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
						if logid:
							logch = message.guild.get_channel(logid['actionlogs'])
						else:
							return
						if logch:
							embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**YouTube video sent in** {message.channel.mention}')
							embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
							embed.add_field(name='Video ID', value=video, inline=False)
							if not invalidvid:
								embed.add_field(name='Title', value=f'[{videoinfo.get("snippet", {}).get("title", "Unknown")}](https://youtu.be/{video})', inline=False)
								embed.add_field(name='Channel', value=f'[{videoinfo.get("snippet", {}).get("channelTitle", "Unknown")}](https://youtube.com/channel/{videoinfo.get("snippet", {}).get("channelId", "Unknown")})', inline=False)
								views = format(int(videoinfo['statistics'].get('viewCount', 0)), ',d')
								likes = format(int(videoinfo['statistics'].get('likeCount', 0)), ',d')
								dislikes = format(int(videoinfo['statistics'].get('dislikeCount', 0)), ',d')
								comments = format(int(videoinfo['statistics'].get('commentCount', 0)), ',d')
								embed.add_field(name='Stats', value=f'{views} views, {likes} likes, {dislikes} dislikes, {comments} comments', inline=False)
							embed.set_footer(text=f"Author ID: {message.author.id}")
							try:
								await logch.send(embed=embed)
							except Exception:
								pass
			if channel:
				if isinstance(message.author, discord.Member):
					if not message.author.permissions_in(message.channel).manage_messages:
						if message.guild.me.permissions_in(message.channel).manage_messages:
							if 'youtube' in self.linkfilter.get(message.guild.id, []):
								try:
									await message.delete()
								except Exception:
									pass
				channelinfo = await self.bot.loop.run_in_executor(None, func=functools.partial(ytcog.channel_info, channel))
				channelinfo = channelinfo.get('items', [])
				if len(channelinfo) < 1:
					pass
				else:
					channelinfo = channelinfo[0]
					if message.guild:
						if message.author.bot:
							return
						logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
						if logid:
							logch = message.guild.get_channel(logid['actionlogs'])
						else:
							return
						if logch:
							embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**YouTube channel sent in** {message.channel.mention}')
							embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
							if invalidchannel:
								embed.add_field(name='Channel', value=f'https://youtube.com/channel/{channel}')
								embed.add_field(name='More Info', value=f'I was unable to find info about this channel.', inline=False)
							else:
								embed.add_field(name='Name', value=f'{channelinfo.get("snippet", {}).get("title", "Unknown")}', inline=False)
								embed.add_field(name='Channel', value=f'https://youtube.com/channel/{channel}')
								embed.add_field(name='Custom URL', value=f'https://youtube.com/{channelinfo.get("snippet", {}).get("customUrl", "N/A")}', inline=False)
								subs = format(int(channelinfo['statistics'].get('subscriberCount', 0)), ',d') if not channelinfo['statistics'].get('hiddenSubscriberCount', False) else 'Hidden'
								views = format(int(channelinfo['statistics'].get('viewCount', 0)), ',d')
								videos = format(int(channelinfo['statistics'].get('videoCount', 0)), ',d')
								embed.add_field(name='Stats', value=f'{subs} subscribers, {views} total views, {videos} videos', inline=False)
							embed.set_footer(text=f"Author ID: {message.author.id}")
							try:
								await logch.send(embed=embed)
							except Exception:
								pass
			twitch = findtwitch(message.system_content)
			if twitch:
				if isinstance(message.author, discord.Member):
					if not message.author.permissions_in(message.channel).manage_messages:
						if message.guild.me.permissions_in(message.channel).manage_messages:
							if 'twitch' in self.linkfilter.get(message.guild.id, []):
								try:
									await message.delete()
								except Exception:
									pass
				if message.guild:
					if message.author.bot:
						return
					logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
					if logid:
						logch = message.guild.get_channel(logid['actionlogs'])
					else:
						return
					if logch:
						embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**Twitch link sent in** {message.channel.mention}')
						embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
						embed.add_field(name='Link', value=f'[{twitch}](https://twitch.tv/{twitch})', inline=False)
						embed.set_footer(text=f"Author ID: {message.author.id}")
						try:
							await logch.send(embed=embed)
						except Exception:
							pass
			twitter = findtwitter(message.system_content)
			if twitter:
				if isinstance(message.author, discord.Member):
					if not message.author.permissions_in(message.channel).manage_messages:
						if message.guild.me.permissions_in(message.channel).manage_messages:
							if 'twitter' in self.linkfilter.get(message.guild.id, []):
								try:
									await message.delete()
								except Exception:
									pass
				if message.guild:
					if message.author.bot:
						return
					logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
					if logid:
						logch = message.guild.get_channel(logid['actionlogs'])
					else:
						return
					if logch:
						embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**Twitter link sent in** {message.channel.mention}')
						embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
						embed.add_field(name='Link', value=f'[{twitter}](https://twitter.com/{twitter})', inline=False)
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
							embed.add_field(name='Reason', value=self.bot.recentpurge[f'{ctx.channel.id}-reason'], inline=False)
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

	def ksoft_ban_hook(self, event):
		self.bot.dispatch('ksoft_ban', event)

	@commands.Cog.listener()
	async def on_ksoft_ban(self, event):
		for guild in self.bot.guilds:
			if guild.id in self.gbancheck:
				logid = self.logchannels[guild.id] if guild.id in self.logchannels else None
				if logid:
					logch = guild.get_channel(logid['modlogs'])
				member = guild.get_member(event.user_id)
				if member:
					try:
						await guild.ban(member, reason=f'{member} was found on global ban list')
						self.recentgban.append(f'{member.id}-{guild.id}')
						if logch:
							embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow(), description=f'**{member.mention} was banned**')
							embed.set_author(name=member, icon_url=str(member.avatar_url))
							embed.add_field(name='Reason', value=f'{member} was found on global ban list', inline=False)
							embed.set_footer(text=f"Member ID: {member.id}")
							try:
								return await logch.send(embed=embed)
							except Exception:
								pass
					except discord.HTTPException:
						return

	@commands.Cog.listener()
	async def on_membercacheadd(self, gid: int, mid: int):
		self.joincache[gid].append(mid)
		await asyncio.sleep(20)
		self.joincache[gid].remove(mid)

	@commands.Cog.listener()
	async def on_raid_attempt(self, guild: discord.Guild, raiders: list = list):
		if not guild:
			return
		channel = guild.get_channel(self.antiraid.get(guild.id, 0))
		if channel:
			try:
				potential = await channel.send(f'There seems to be a raid going on. If that is correct, click the tick to ban.')
				firesuccess = discord.utils.get(self.bot.emojis, id=603214443442077708)
				firefailed = discord.utils.get(self.bot.emojis, id=603214400748257302)
				await potential.add_reaction(firesuccess)
				await potential.add_reaction(firefailed)
				def ban_check(r, u):
					return u.permissions_in(channel).ban_members and u.id != guild.me.id
				doi, ban = await self.bot.wait_for('reaction_add', check=ban_check)
				if doi.emoji == firesuccess and ban:
					try:
						[await guild.ban(discord.Object(x), reason=f'Automatic raid prevention, confirmed by {ban}') for x in raiders if guild.get_member(x)]
					except Exception:
						pass
					return await channel.send('I have banned all raiders I found!')
				if doi.emoji == firefailed:
					await potential.delete()
					return await channel.send('Ok, I will ignore it.')
			except Exception:
				try:
					await channel.send('Something went wrong')
				except Exception:
					return
		else:
			return

	@commands.Cog.listener()
	async def on_msgraid_attempt(self, guild: discord.Guild, raiders: list = list):
		if not guild:
			return
		channel = guild.get_channel(self.antiraid.get(guild.id, 0))
		if channel:
			try:
				raidmentions = ', '.join([x.mention for x in raiders])
				potential = await channel.send(f'There seems to be a raid going on. Here\'s the raiders I found\n{raidmentions}\n\nClick the tick to ban.')
				firesuccess = discord.utils.get(self.bot.emojis, id=603214443442077708)
				firefailed = discord.utils.get(self.bot.emojis, id=603214400748257302)
				await potential.add_reaction(firesuccess)
				await potential.add_reaction(firefailed)
				def ban_check(r, u):
					return u.permissions_in(channel).ban_members and u.id != guild.me.id
				doi, ban = await self.bot.wait_for('reaction_add', check=ban_check)
				if doi.emoji == firesuccess and ban:
					try:
						[await guild.ban(x, reason=f'Automatic raid prevention, confirmed by {ban}') for x in raiders if guild.get_member(x.id)]
					except Exception:
						pass
					return await channel.send('I have banned all raiders I found!')
				if doi.emoji == firefailed:
					await potential.delete()
					return await channel.send('Ok, I will ignore it.')
			except Exception:
				try:
					await channel.send('Something went wrong')
				except Exception:
					return
		else:
			return

	@commands.Cog.listener()
	async def on_member_join(self, member):
		await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'members.join'))
		premium = self.bot.get_cog('Premium Commands').premiumGuilds
		if member.guild.id in premium:
			self.bot.dispatch('membercacheadd', member.guild.id, member.id)
			if len(self.joincache[member.guild.id]) >= 50:
				self.bot.dispatch('raid_attempt', member.guild, self.joincache[member.guild.id])
		usedinvite = None
		if member.guild.id in self.bot.invites and member.guild.id in premium:
			before = self.bot.invites[member.guild.id].copy()
			await self.loadInvites(member.guild.id)
			after = self.bot.invites[member.guild.id]
			for inv in before:
				a = after.get(inv, False)
				b = before[inv]
				if b != a:
					usedinvite = inv
		joinleave = self.joinleave.get(member.guild.id, False)
		if joinleave:
			joinchan = joinleave.get('joinchan', False)
			joinmsg = joinleave.get('joinmsg', False)
			if joinchan and joinmsg:
				channel = member.guild.get_channel(joinchan)
				message = joinmsg.replace('{user.mention}', member.mention).replace('{user}', str(member)).replace('{user.name}', member.name).replace('{user.discrim}', member.discriminator).replace('{server}', member.guild.name).replace('{guild}', member.guild.name)
				await channel.send(message)
		logid = self.logchannels[member.guild.id] if member.guild.id in self.logchannels else None
		if logid:
			logch = member.guild.get_channel(logid['modlogs'])
		else:
			return
		if member.guild.id in self.gbancheck:
			banned = await self.bot.ksoft.bans_check(member.id)
			if banned:
				try:
					await member.guild.ban(member, reason=f'{member} was found on global ban list')
					self.recentgban.append(f'{member.id}-{member.guild.id}')
					if logch:
						embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow(), description=f'**{member.mention} was banned**')
						embed.set_author(name=member, icon_url=str(member.avatar_url))
						embed.add_field(name='Reason', value=f'{member} was found on global ban list', inline=False)
						embed.set_footer(text=f"Member ID: {member.id}")
						try:
							return await logch.send(embed=embed)
						except Exception:
							pass
				except discord.HTTPException:
					return
		if logch:
			#https://giphy.com/gifs/pepsi-5C0a8IItAWRebylDRX
			embed = discord.Embed(title='Member Joined', url='https://i.giphy.com/media/Nx0rz3jtxtEre/giphy.gif', color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
			embed.set_author(name=f'{member}', icon_url=str(member.avatar_url))
			embed.add_field(name='Account Created', value=humanfriendly.format_timespan(datetime.datetime.utcnow() - member.created_at) + ' ago', inline=False)
			if usedinvite and member.guild.id in premium:
				embed.add_field(name='Invite Used', value=usedinvite, inline=False)
			embed.set_footer(text=f'User ID: {member.id}')
			try:
				await logch.send(embed=embed)
			except Exception:
				pass
		try:
			if member.guild.id in self.autodecancer:
				if not self.bot.isascii(member.name.replace('‘', '\'').replace('“', '"').replace('“', '"')): #fix weird mobile characters
					num = member.discriminator
					return await member.edit(nick=f'John Doe {num}')
			if member.guild.id in self.autodehoist:
				if self.bot.ishoisted(member.name):
					num = member.discriminator
					return await member.edit(nick=f'John Doe {num}')
		except Exception:
			pass

	@commands.Cog.listener()
	async def on_member_remove(self, member):
		await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'members.leave'))
		joinleave = self.joinleave.get(member.guild.id, False)
		if joinleave:
			leavechan = joinleave.get('leavechan', False)
			leavemsg = joinleave.get('leavemsg', False)
			if leavechan and leavemsg:
				channel = member.guild.get_channel(leavechan)
				message = leavemsg.replace('{user.mention}', member.mention).replace('{user}', str(member)).replace('{user.name}', member.name).replace('{user.discrim}', member.discriminator).replace('{server}', member.guild.name).replace('{guild}', member.guild.name)
				await channel.send(message)
		logid = self.logchannels[member.guild.id] if member.guild.id in self.logchannels else None
		if logid:
			logch = member.guild.get_channel(logid['modlogs'])
		else:
			return
		if logch:
			embed = discord.Embed(title='Member Left', url='https://i.giphy.com/media/5C0a8IItAWRebylDRX/source.gif', color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
			embed.set_author(name=f'{member}', icon_url=str(member.avatar_url))
			if member.nick:
				embed.add_field(name='Nickname', value=member.nick, inline=False)
			roles = [role.mention for role in member.roles if role != member.guild.default_role]
			if roles:
				embed.add_field(name='Roles', value=', '.join(roles), inline=False)
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
							nitroboosters = discord.utils.get(member.guild.roles, id=585534346551754755)
							if member.guild_permissions.manage_nicknames:
								pass
							if nitroboosters and nitroboosters in member.roles:
								pass
							else:
								nick = after.name
								if not self.bot.isascii(nick.replace('‘', '\'').replace('“', '"').replace('“', '"')):
									num = member.discriminator
									return await member.edit(nick=f'John Doe {num}')
								else:
									if member.nick and 'John Doe' in member.nick:
										return await member.edit(nick=None)
						if member.guild.id in self.autodehoist:
							nitroboosters = discord.utils.get(member.guild.roles, id=585534346551754755)
							if member.guild_permissions.manage_nicknames:
								pass
							if nitroboosters and nitroboosters in member.roles:
								pass
							else:
								nick = after.name
								if self.bot.ishoisted(nick):
									num = member.discriminator
									return await member.edit(nick=f'John Doe {num}')
								else:
									if member.nick and 'John Doe' in member.nick:
										return await member.edit(nick=None)
				except Exception:
					pass

	@commands.Cog.listener()
	async def on_member_update(self, before, after):
		if before.nick != after.nick:
			if after.nick != None and f'John Doe {after.discriminator}' in after.nick:
				return
			try:
				if after.guild.id in self.autodecancer:
					nitroboosters = discord.utils.get(after.guild.roles, id=585534346551754755)
					if after.guild_permissions.manage_nicknames or nitroboosters in after.roles:
						pass
					else:
						if not after.nick:
							nick = after.name
						else:
							nick = after.nick
						if not self.bot.isascii(nick.replace('‘', '\'').replace('“', '"').replace('“', '"')):
							num = after.discriminator
							return await after.edit(nick=f'John Doe {num}')
				if after.guild.id in self.autodehoist:
					nitroboosters = discord.utils.get(after.guild.roles, id=585534346551754755)
					if after.guild_permissions.manage_nicknames or nitroboosters in after.roles:
						pass
					else:
						if not after.nick:
							nick = after.name
						else:
							nick = after.nick
						if self.bot.ishoisted(nick):
							num = after.discriminator
							return await after.edit(nick=f'John Doe {num}')
			except Exception:
				pass
			logid = self.logchannels[after.guild.id] if after.guild.id in self.logchannels else None
			if logid:
				logch = after.guild.get_channel(logid['actionlogs'])
			else:
				return
			if logch and after.nick:
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
			# if before.self_stream != after.self_stream:
			# 	if after.self_stream:
			# 		if after.channel:
			# 			embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **went live in {after.channel.name}**')
			# 			embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
			# 		else:
			# 			embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **went live**')
			# 			embed.set_footer(text=f"Member ID: {member.id}")
			# 		embed.set_author(name=member, icon_url=str(member.avatar_url))
			# 		try:
			# 			await logch.send(embed=embed)
			# 		except Exception:
			# 			pass
			# 	elif not after.self_stream:
			# 		if after.channel:
			# 			embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **stopped being live in {after.channel.name}**')
			# 			embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
			# 		else:
			# 			embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow(), description=f'{member.mention} **stopped being live**')
			# 			embed.set_footer(text=f"Member ID: {member.id}")
			# 		embed.set_author(name=member, icon_url=str(member.avatar_url))
			# 		try:
			# 			await logch.send(embed=embed)
			# 		except Exception:
			# 			pass
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
			if set(before.features) != set(after.features):
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
					embed = discord.Embed(color=discord.Color.from_rgb(255, 115, 250), timestamp=datetime.datetime.utcnow(), description=f'**{after.name} got boosted to Level {after.premium_tier}**')
				if after.premium_tier < before.premium_tier:
					embed = discord.Embed(color=discord.Color.from_rgb(255, 115, 250), timestamp=datetime.datetime.utcnow(), description=f'**{after.name} got weakened to Level {after.premium_tier}**')
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
		if f'{member.id}-{guild.id}' in self.recentgban:
			self.recentgban.remove(f'{member.id}-{guild.id}')
			return
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
			'linkfilter': 'Disabled',
			'dupecheck': 'Disabled',
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
				modlogs = 0
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
				actionlogs = 0
			con = await self.bot.db.acquire()
			async with con.transaction():
				q = 'UPDATE settings SET actionlogs = $1 WHERE gid = $2;'
				await self.bot.db.execute(q, actionlogs, ctx.guild.id)
			await self.bot.db.release(con)
		except asyncio.TimeoutError:
			await self.loadSettings()
			return await ctx.send(f'{ctx.author.mention}, you took too long. Stopping setup!')
		await asyncio.sleep(2)
		await ctx.send('Ok. Next is link deletion. Discord invites are enabled by default but you can enable more with `$linkfilter`')
		await asyncio.sleep(2)
		linkfiltermsg = await ctx.send(f'React with {firesuccess} to enable and {firefailed} to disable')
		await linkfiltermsg.add_reaction(firesuccess)
		await linkfiltermsg.add_reaction(firefailed)
		def linkfilter_check(reaction, user):
			if user != ctx.author:
				return False
			if reaction.emoji == firefailed and reaction.message.id == linkfiltermsg.id:
				return True
			if reaction.emoji == firesuccess and reaction.message.id == linkfiltermsg.id:
				settingslist['linkfilter'] = 'Enabled'
				return True
		try:
			await self.bot.wait_for('reaction_add', timeout=30.0, check=linkfilter_check)
			linkfilter = settingslist['linkfilter']
			if linkfilter == 'Disabled':
				linkfilter = []
				await ctx.send('Disabling link filter...')
			elif linkfilter == 'Enabled':
				linkfilter = ['discord']
				await ctx.send(f'Great! I\'ll enable link filtering! (If it was already enabled, your configuration won\'t change)')
			con = await self.bot.db.acquire()
			async with con.transaction():
				if ctx.guild.id in self.linkfilter and linkfilter == []:
					q = 'DELETE FROM linkfilter WHERE gid = $1;'
					await self.bot.db.execute(q, ctx.guild.id)
				if ctx.guild.id not in self.linkfilter and linkfilter == ['discord']:
					q = 'INSERT INTO linkfilter (\"gid\", \"enabled\") VALUES ($1, $2);'
					await self.bot.db.execute(q, ctx.guild.id, linkfilter)
			await self.bot.db.release(con)
		except asyncio.TimeoutError:
			await self.loadSettings()
			return await ctx.send(f'{ctx.author.mention}, you took too long. Stopping setup!')
		await asyncio.sleep(2)
		await ctx.send('Ok. Next is dupe checking. If a user attempts to send the same message again, I will delete it (that is, if I have permission to do so)')
		await asyncio.sleep(2)
		dupemsg = await ctx.send(f'React with {firesuccess} to enable and {firefailed} to disable')
		await dupemsg.add_reaction(firesuccess)
		await dupemsg.add_reaction(firefailed)
		def dupemsg_check(reaction, user):
			if user != ctx.author:
				return False
			if reaction.emoji == firefailed and reaction.message.id == dupemsg.id:
				return True
			if reaction.emoji == firesuccess and reaction.message.id == dupemsg.id:
				settingslist['dupecheck'] = 'Enabled'
				return True
		try:
			await self.bot.wait_for('reaction_add', timeout=30.0, check=dupemsg_check)
			dupecheck = settingslist['dupecheck']
			if dupecheck == 'Disabled':
				dupecheck = 0
				await ctx.send('Disabling dupe checking...')
			elif dupecheck == 'Enabled':
				dupecheck = 1
				await ctx.send(f'Great! I\'ll enable dupe checking!')
			con = await self.bot.db.acquire()
			async with con.transaction():
				q = 'UPDATE settings SET dupecheck = $1 WHERE gid = $2;'
				await self.bot.db.execute(q, dupecheck, ctx.guild.id)
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
		embed.add_field(name="Invite Filter", value=settingslist['linkfilter'], inline=False)
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

	@commands.command(name='joinmsg', description='Set the channel and message for join messages')
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def joinmsg(self, ctx, channel: typing.Union[TextChannel, str] = None, *, message: str = None):
		if not channel:
			current = self.joinleave.get(ctx.guild.id, {})
			if not current.get('joinmsg', False):
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow(), description=f'<a:fireFailed:603214400748257302> Please provide a channel and message for join messages.')
				variables = '{user}: {fuser}\n{user.mention}: {fmention}\n{user.name}: {fname}\n{user.discrim}: {fdiscrim}\n{server}|{guild}: {fguild}'.replace('{fmention}', ctx.author.mention).replace('{fuser}', str(ctx.author)).replace('{fname}', ctx.author.name).replace('{fdiscrim}', ctx.author.discriminator).replace('{fguild}', ctx.guild.name)
				embed.add_field(name='Variables', value=variables, inline=False)
				return await ctx.send(embed=embed)
			embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.utcnow(), description=f'**Current Join Message Settings**\nDo __{ctx.prefix}joinmsg disable__ to disable join messages')
			currentchan = ctx.guild.get_channel(current.get('joinchan', 0))
			embed.add_field(name='Channel', value=currentchan.mention if currentchan else 'Not Set (Not sure how you managed to do this)', inline=False)
			message = current.get('joinmsg', 'Not Set')
			message = message.replace('{user.mention}', ctx.author.mention).replace('{user}', str(ctx.author)).replace('{user.name}', ctx.author.name).replace('{user.discrim}', ctx.author.discriminator).replace('{server}', ctx.guild.name).replace('{guild}', ctx.guild.name)
			embed.add_field(name='Message', value=message, inline=False)
			variables = '{user}: {fuser}\n{user.mention}: {fmention}\n{user.name}: {fname}\n{user.discrim}: {fdiscrim}\n{server}|{guild}: {fguild}'.replace('{fmention}', ctx.author.mention).replace('{fuser}', str(ctx.author)).replace('{fname}', ctx.author.name).replace('{fdiscrim}', ctx.author.discriminator).replace('{fguild}', ctx.guild.name)
			embed.add_field(name='Variables', value=variables, inline=False)
			return await ctx.send(embed=embed)
		if channel == 'disable':
			current = self.joinleave.get(ctx.guild.id, {}).get('joinmsg', False)
			if not current:
				return await ctx.send('<a:fireFailed:603214400748257302> Can\'t disable something that wasn\'t enabled. ¯\_(ツ)_/¯')
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'UPDATE joinleave SET (joinchan, joinmsg) = (NULL, NULL) WHERE gid = $1;'
				await self.bot.db.execute(query, ctx.guild.id)
			await self.bot.db.release(con)
			await self.loadSettings()
			current = self.joinleave.get(ctx.guild.id, {}).get('joinmsg', False)
			if not current:
				return await ctx.send(f'<a:fireSuccess:603214443442077708> Successfully disabled join messages!')
		if type(channel) == str:
			return await ctx.send('<a:fireFailed:603214400748257302> You need to provide a valid channel')
		if not message:
			currentmsg = self.joinleave.get(ctx.guild.id, {}).get('joinmsg', False)
			if not currentmsg:
				return await ctx.send('<a:fireFailed:603214400748257302> You can\'t set a channel without setting a message.')
			con = await self.bot.db.acquire()
			async with con.transaction():
				if ctx.guild.id in self.joinleave:
					query = 'UPDATE joinleave SET joinchan = $1 WHERE gid = $2;'
				else:
					query = 'INSERT INTO joinleave (\"joinchan\", \"gid\") VALUES ($1, $2);'
				await self.bot.db.execute(query, channel.id, ctx.guild.id)
			await self.bot.db.release(con)
			await self.loadSettings()
			message = currentmsg.replace('{user.mention}', ctx.author.mention).replace('{user}', str(ctx.author)).replace('{user.name}', ctx.author.name).replace('{user.discrim}', ctx.author.discriminator).replace('{server}', ctx.guild.name).replace('{guild}', ctx.guild.name)
			return await ctx.send(f'<a:fireSuccess:603214443442077708> Join messages will show in {channel.mention}!\nExample: {message}')
		else:
			con = await self.bot.db.acquire()
			async with con.transaction():
				if ctx.guild.id in self.joinleave:
					query = 'UPDATE joinleave SET joinchan = $1, joinmsg = $2 WHERE gid = $3;'
				else:
					query = 'INSERT INTO joinleave (\"joinchan\", \"joinmsg\", \"gid\") VALUES ($1, $2, $3);'
				await self.bot.db.execute(query, channel.id, message, ctx.guild.id)
			await self.bot.db.release(con)
			await self.loadSettings()
			message = message.replace('{user.mention}', ctx.author.mention).replace('{user}', str(ctx.author)).replace('{user.name}', ctx.author.name).replace('{user.discrim}', ctx.author.discriminator).replace('{server}', ctx.guild.name).replace('{guild}', ctx.guild.name)
			return await ctx.send(f'<a:fireSuccess:603214443442077708> Join messages will show in {channel.mention}!\nExample: {message}')

	@commands.command(name='leavemsg', description='Set the channel and message for leave messages')
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def leavemsg(self, ctx, channel: typing.Union[TextChannel, str] = None, *, message: str = None):
		if not channel:
			current = self.joinleave.get(ctx.guild.id, {})
			if not current.get('leavemsg', False):
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow(), description=f'<a:fireFailed:603214400748257302> Please provide a channel and message for leave messages.')
				variables = '{user}: {fuser}\n{user.mention}: {fmention}\n{user.name}: {fname}\n{user.discrim}: {fdiscrim}\n{server}|{guild}: {fguild}'.replace('{fmention}', ctx.author.mention).replace('{fuser}', str(ctx.author)).replace('{fname}', ctx.author.name).replace('{fdiscrim}', ctx.author.discriminator).replace('{fguild}', ctx.guild.name)
				embed.add_field(name='Variables', value=variables, inline=False)
				return await ctx.send(embed=embed)
			embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.utcnow(), description=f'**Current Leave Message Settings**\nDo __{ctx.prefix}leavemsg disable__ to disable leave messages')
			currentchan = ctx.guild.get_channel(current.get('leavechan', 0))
			embed.add_field(name='Channel', value=currentchan.mention if currentchan else 'Not Set (Not sure how you managed to do this)', inline=False)
			message = current.get('leavemsg', 'Not Set')
			message = message.replace('{user.mention}', ctx.author.mention).replace('{user}', str(ctx.author)).replace('{user.name}', ctx.author.name).replace('{user.discrim}', ctx.author.discriminator).replace('{server}', ctx.guild.name).replace('{guild}', ctx.guild.name)
			embed.add_field(name='Message', value=message, inline=False)
			variables = '{user}: {fuser}\n{user.mention}: {fmention}\n{user.name}: {fname}\n{user.discrim}: {fdiscrim}\n{server}|{guild}: {fguild}'.replace('{fmention}', ctx.author.mention).replace('{fuser}', str(ctx.author)).replace('{fname}', ctx.author.name).replace('{fdiscrim}', ctx.author.discriminator).replace('{fguild}', ctx.guild.name)
			embed.add_field(name='Variables', value=variables, inline=False)
			return await ctx.send(embed=embed)
		if channel == 'disable':
			current = self.joinleave.get(ctx.guild.id, {}).get('leavemsg', False)
			if not current:
				return await ctx.send('<a:fireFailed:603214400748257302> Can\'t disable something that wasn\'t enabled. ¯\_(ツ)_/¯')
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'UPDATE joinleave SET (leavechan, leavemsg) = (NULL, NULL) WHERE gid = $1;'
				await self.bot.db.execute(query, ctx.guild.id)
			await self.bot.db.release(con)
			await self.loadSettings()
			current = self.joinleave.get(ctx.guild.id, {}).get('leavemsg', False)
			if not current:
				return await ctx.send(f'<a:fireSuccess:603214443442077708> Successfully disabled leave messages!')
		if type(channel) == str:
			return await ctx.send('<a:fireFailed:603214400748257302> You need to provide a valid channel')
		if not message:
			currentmsg = self.joinleave.get(ctx.guild.id, {}).get('leavemsg', False)
			if not currentmsg:
				return await ctx.send('<a:fireFailed:603214400748257302> You can\'t set a channel without setting a message.')
			con = await self.bot.db.acquire()
			async with con.transaction():
				if ctx.guild.id in self.joinleave:
					query = 'UPDATE joinleave SET leavechan = $1 WHERE gid = $2;'
				else:
					query = 'INSERT INTO joinleave (\"leavechan\", \"gid\") VALUES ($1, $2);'
				await self.bot.db.execute(query, channel.id, ctx.guild.id)
			await self.bot.db.release(con)
			await self.loadSettings()
			message = currentmsg.replace('{user.mention}', ctx.author.mention).replace('{user}', str(ctx.author)).replace('{user.name}', ctx.author.name).replace('{user.discrim}', ctx.author.discriminator).replace('{server}', ctx.guild.name).replace('{guild}', ctx.guild.name)
			return await ctx.send(f'<a:fireSuccess:603214443442077708> Leave messages will show in {channel.mention}!\nExample: {message}')
		else:
			con = await self.bot.db.acquire()
			async with con.transaction():
				if ctx.guild.id in self.joinleave:
					query = 'UPDATE joinleave SET leavechan = $1, leavemsg = $2 WHERE gid = $3;'
				else:
					query = 'INSERT INTO joinleave (\"leavechan\", \"leavemsg\", \"gid\") VALUES ($1, $2, $3);'
				await self.bot.db.execute(query, channel.id, message, ctx.guild.id)
			await self.bot.db.release(con)
			await self.loadSettings()
			message = message.replace('{user.mention}', ctx.author.mention).replace('{user}', str(ctx.author)).replace('{user.name}', ctx.author.name).replace('{user.discrim}', ctx.author.discriminator).replace('{server}', ctx.guild.name).replace('{guild}', ctx.guild.name)
			return await ctx.send(f'<a:fireSuccess:603214443442077708> Leave messages will show in {channel.mention}!\nExample: {message}')

	@commands.command(name='linkfilter', description='Configure the link filter for this server')
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def linkfiltercmd(self, ctx, *, enabled: str = None):
		options = ['discord', 'youtube', 'twitch', 'twitter', 'paypal', 'malware']
		if not enabled:
			return await ctx.send(f'<a:fireFailed:603214400748257302> You must provide valid filters. You can choose from {", ".join(options)}')
		enabled = enabled.split(' ')
		if len([f.lower() for f in enabled if f not in options]) >= 1:
			return await ctx.send(f'<a:fireFailed:603214400748257302> {", ".join([f for f in enabled if f not in options])} aren\'t valid filter(s)')
		con = await self.bot.db.acquire()
		async with con.transaction():
			if ctx.guild.id in self.linkfilter:
				query = 'UPDATE linkfilter SET enabled = $1 WHERE gid = $2'
			else:
				query = 'INSERT INTO linkfilter (\"enabled\", \"gid\") VALUES ($1, $2);'
			await self.bot.db.execute(query, [e.lower() for e in enabled], ctx.guild.id)
		await self.bot.db.release(con)
		self.linkfilter[ctx.guild.id] = [e.lower() for e in enabled]
		return await ctx.send(f'<a:fireSuccess:603214443442077708> Successfully enabled filtering for {", ".join(enabled)} links')

	@commands.command(name='filterexcl', description='Exclude channels, roles and members from the filter')
	async def filterexclcmd(self, ctx, *ids: typing.Union[TextChannel, Role, Member]):
		if not ids:
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'UPDATE settings SET filterexcl = $1 WHERE gid = $2;'
				await self.bot.db.execute(query, [], ctx.guild.id)
			await self.bot.db.release(con)
			self.filterexcl[ctx.guild.id] = []
			return await ctx.send(f'I\'ve reset the filter exclusion list. Only users with **Manage Mesages** are excluded.')
		else:
			idlist = [a.id for a in ids]
			if ctx.guild.id in self.filterexcl:
				idlist = idlist + self.filterexcl[ctx.guild.id]
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'UPDATE settings SET filterexcl = $1 WHERE gid = $2;'
				await self.bot.db.execute(query, idlist, ctx.guild.id)
			await self.bot.db.release(con)
			self.filterexcl[ctx.guild.id] = idlist
			names = [a.name for a in ids]
			namelist = ', '.join(names)
			return await ctx.send(f'<a:fireSuccess:603214443442077708> {namelist} are now excluded from the filter')

	@commands.command(name='command', description='Enable and disable commands')
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def cmd(self, ctx, command: str = None):
		if not command:
			return await ctx.send('<a:fireFailed:603214400748257302> You must provide a command name')
		command = self.bot.get_command(command)
		if not command:
			return await ctx.send('<a:fireFailed:603214400748257302> You must provide a valid command')
		disabled = self.disabledcmds[ctx.guild.id]
		if command.name in disabled:
			toggle = 'enabled'
			disabled.remove(command.name)
		else:
			toggle = 'disabled'
			disabled.append(command.name)
		self.disabledcmds[ctx.guild.id] = disabled
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'UPDATE settings SET disabledcmds = $1 WHERE gid = $2;'
			await self.bot.db.execute(query, disabled, ctx.guild.id)
		await self.bot.db.release(con)
		return await ctx.send(f'<a:fireSuccess:603214443442077708> {command.name} has been {toggle}.')
		


def setup(bot):
	bot.add_cog(settings(bot))
