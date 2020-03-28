"""
MIT License
Copyright (c) 2020 GamingGeek

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

# 🦀

import discord
from fire.converters import User, UserWithFallback, Member, TextChannel, VoiceChannel, Category, Role
from jishaku.paginators import PaginatorInterface, PaginatorEmbedInterface, WrappedPaginator
from discord import Webhook, AsyncWebhookAdapter
from discord.ext import commands, flags, tasks
from jishaku.models import copy_context_with
import datetime
import json
import time
import os
import typing
import re
import asyncpg
import functools
import strgen
import asyncio
import aiohttp
import humanfriendly
import traceback
from colormap import rgb2hex, hex2rgb
from emoji import UNICODE_EMOJI
from PIL import Image
from PIL import ImageFilter
from PIL import ImageFont
from PIL import ImageDraw
from io import BytesIO
from gtts import gTTS
from fire.invite import findinvite
from fire.push import pushover
from fire.exceptions import PushError
from fire import slack

launchtime = datetime.datetime.utcnow()


with open('config.json', 'r') as cfg:
	config = json.load(cfg)
	error_string = '<:xmark:674359427830382603>'
	success_string = '<:check:674359197378281472>'

disabled = [264445053596991498, 110373943822540800, 336642139381301249, 458341246453415947]

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

notifs = {
	'NotificationLevel.all_messages': 'All Messages',
	'NotificationLevel.only_mentions': 'Only Mentions'
}

permissions = {
	'administrator': 'Admin',
	'ban_members': 'Ban',
	'change_nickname': 'Change Nick',
	'kick_members': 'Kick',
	'manage_channels': 'Manage Channels',
	'manage_emojis': 'Manage Emojis',
	'manage_guild': 'Manage Guild',
	'manage_messages': 'Manage Messages',
	'manage_nicknames': 'Manage Nicks',
	'manage_roles': 'Manage Roles',
	'manage_webhooks': 'Manage Webhooks',
	'mention_everyone': 'Mention Everyone',
	'view_audit_log': 'View Logs'
}

dehoistchars = '1234567890abcdefghijklmnopqrstuvwxyz'

month_regex = re.compile(r'(?:me in |in )?(?:(?P<months>\d+)(?:mo|months|month| months| month))(?: about | that )?')
day_regex = re.compile(r'(?:me in |in )?(?:(?P<days>\d+)(?:d|days|day| days| day))(?: about | that )?')
hour_regex = re.compile(r'(?:me in |in )?(?:(?P<hours>\d+)(?:h|hours|hour| hours| hour))(?: about | that )?')
min_regex = re.compile(r'(?:me in |in )?(?:(?P<minutes>\d+)(?:m|minutes|minute| minutes| minute))(?: about | that )?')
sec_regex = re.compile(r'(?:me in |in )?(?:(?P<seconds>\d+)(?:s|seconds|second| seconds| second))(?: about | that )?')

def parseTime(content, replace: bool = False):
	if replace:
		for regex in [r'(?:me in |in )?(?:(?P<months>\d+)(?:mo|months|month| months| month))(?: about | that )?', r'(?:me in |in )?(?:(?P<days>\d+)(?:d|days|day| days| day))(?: about | that )?', r'(?:me in |in )?(?:(?P<hours>\d+)(?:h|hours|hour| hours| hour))(?: about | that )?', r'(?:me in |in )?(?:(?P<minutes>\d+)(?:m|minutes|minute| minutes| minute))(?: about | that )?', r'(?:me in |in )?(?:(?P<seconds>\d+)(?:s|seconds|second| seconds| second))(?: about | that )?']:
			content = re.sub(regex, '', content, 0, re.MULTILINE)
		return content
	try:
		months = month_regex.search(content)
		days = day_regex.search(content)
		hours = hour_regex.search(content)
		minutes = min_regex.search(content)
		seconds = sec_regex.search(content)
	except Exception:
		return 0, 0, 0, 0
	time = 0
	if months or days or hours or minutes or seconds:
		months = months.group(1) if months is not None else 0
		days = days.group(1) if days is not None else 0
		hours = hours.group(1) if hours is not None else 0
		minutes = minutes.group(1) if minutes is not None else 0
		seconds = seconds.group(1) if seconds is not None else 0
		days = int(days) if days else 0
		if not days:
			days = 0
		if months:
			days += int(months)*30 if months else 0
		hours = int(hours) if hours else 0
		if not hours:
			hours = 0
		minutes = int(minutes) if minutes else 0
		if not minutes:
			minutes = 0
		seconds = int(seconds) if seconds else 0
		if not seconds:
			seconds = 0
		return days, hours, minutes, seconds
	return 0, 0, 0, 0

class utils(commands.Cog, name='Utility Commands'):
	def __init__(self, bot):
		self.bot = bot
		self.bot.recentpurge = {}
		self.bot.is_emoji = self.is_emoji
		self.bot.len_emoji = self.len_emoji
		self.bot.isascii = lambda s: len(s) == len(s.encode())
		self.bot.getperms = self.getperms
		self.bot.getguildperms = self.getguildperms
		self.bot.ishoisted = self.ishoisted
		self.published = {}
		self.bot.vanity_urls = {}
		self.bot.redirects = {}
		if 'slack_messages' not in dir(self.bot):
 			self.bot.slack_messages = {}
		self.bot.get_vanity = self.get_vanity
		self.bot.get_redirect = self.get_redirect
		self.bot.get_vanity_gid = self.get_vanity_gid
		self.bot.vanityclick = self.vanityclick
		self.bot.vanitylink = self.vanitylink
		self.tags = {}
		self.bans = {}
		self.reminders = {}
		asyncio.get_event_loop().create_task(self.loadvanitys())
		asyncio.get_event_loop().create_task(self.loadtags())
		asyncio.get_event_loop().create_task(self.loadbans())
		asyncio.get_event_loop().create_task(self.loadremind())
		self.remindcheck.start()

	def is_emoji(self, s):
		return s in UNICODE_EMOJI

	def len_emoji(self, s):
		count = 0
		for c in s:
			if self.is_emoji(c):
				count += 1
		return count

	def getperms(self, member: discord.Member, channel: typing.Union[discord.TextChannel, discord.VoiceChannel, discord.CategoryChannel]):
		perms = []
		for perm, value in member.permissions_in(channel):
			if value:
				perms.append(perm)
		return perms

	def getguildperms(self, member: discord.Member):
		perms = []
		for perm, value in member.guild_permissions:
			if value:
				perms.append(perm)
		return perms

	def ishoisted(self, string: str):
		if string.lower()[0] not in dehoistchars:
			return True
		else:
			return False

	def get_vanity(self, code: str):
		if code.lower() in self.bot.vanity_urls:
			return self.bot.vanity_urls[code.lower()]
		else:
			return False

	def get_redirect(self, code: str):
		if code.lower() in self.bot.redirects:
			return self.bot.redirects[code.lower()]
		else:
			return False

	def get_vanity_gid(self, gid: int):
		for v in self.bot.vanity_urls:
			v = self.bot.vanity_urls[v]
			if v['gid'] == gid:
				return v
		return False

	async def createvanity(self, ctx: commands.Context, code: str, inv: discord.Invite):
		code = code.lower()
		query = 'SELECT * FROM vanity WHERE gid = $1;'
		current = await self.bot.db.fetch(query, ctx.guild.id)
		if not current:
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO vanity (\"gid\", \"code\", \"invite\") VALUES ($1, $2, $3);'
				await self.bot.db.execute(query, ctx.guild.id, code, inv.code)
			await self.bot.db.release(con)
		else:
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'UPDATE vanity SET (\"code\", \"invite\") = ($2, $3) WHERE gid = $1;'
				await self.bot.db.execute(query, ctx.guild.id, code, inv.code)
			await self.bot.db.release(con)
		await self.loadvanitys()
		try:
			return self.bot.vanity_urls[code]
		except KeyError:
			return False

	async def createredirect(self, code: str, url: str, uid: int):
		code = code.lower()
		currentuser = [r for r in self.bot.redirects if self.bot.redirects[r]['uid'] == uid]
		if len(currentuser) >= 5 and uid != 287698408855044097:
			raise commands.CommandError('You can only have 5 redirects!')
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'INSERT INTO vanity (\"code\", \"redirect\", \"uid\") VALUES ($1, $2, $3);'
			await self.bot.db.execute(query, code, url, uid)
		await self.bot.db.release(con)
		await self.loadvanitys()
		try:
			return self.bot.redirects[code]
		except KeyError:
			return False

	async def vanityclick(self, code: str):
		code = code.lower()
		query = 'SELECT * FROM vanity WHERE code = $1;'
		current = await self.bot.db.fetch(query, code)
		if not current:
			return
		clicks = current[0]['clicks'] + 1
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'UPDATE vanity SET clicks = $2 WHERE code = $1;'
			await self.bot.db.execute(query, code, clicks)
		await self.bot.db.release(con)
		self.bot.vanity_urls[code]['clicks'] += 1

	async def vanitylink(self, code: str):
		code = code.lower()
		query = 'SELECT * FROM vanity WHERE code = $1;'
		current = await self.bot.db.fetch(query, code)
		if not current:
			return
		links = current[0]['links'] + 1
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'UPDATE vanity SET links = $2 WHERE code = $1;'
			await self.bot.db.execute(query, code, links)
		await self.bot.db.release(con)
		self.bot.vanity_urls[code]['links'] += 1

	async def deletevanity(self, ctx: commands.Context):
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM vanity WHERE gid = $1;'
			await self.bot.db.execute(query, ctx.guild.id)
		await self.bot.db.release(con)
		await self.loadvanitys()

	async def deletevanitycode(self, code: str):
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM vanity WHERE code = $1;'
			await self.bot.db.execute(query, code)
		await self.bot.db.release(con)
		await self.loadvanitys()

	async def deletevanitygid(self, gid: int):
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM vanity WHERE gid = $1;'
			await self.bot.db.execute(query, gid)
		await self.bot.db.release(con)
		await self.loadvanitys()

	@commands.Cog.listener()
	async def on_guild_remove(self, guild):
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM vanity WHERE gid = $1;'
			await self.bot.db.execute(query, guild.id)
		await self.bot.db.release(con)

	async def loadvanitys(self):
		await self.bot.wait_until_ready()
		self.bot.logger.info(f'$YELLOWLoading vanity urls & redirects...')
		self.bot.vanity_urls = {}
		self.bot.redirects = {}
		query = 'SELECT * FROM vanity;'
		vanitys = await self.bot.db.fetch(query)
		for v in vanitys:
			if v['redirect']:
				self.bot.redirects[v['code'].lower()] = {
					'url': v['redirect'],
					'uid': v['uid']
				}
			else:
				guild = v['gid']
				code = v['code'].lower()
				invite = v['invite']
				clicks = v['clicks']
				links = v['links']
				self.bot.vanity_urls[code] = {
					'gid': guild,
					'invite': invite,
					'code': code,
					'clicks': clicks,
					'links': links,
					'url': f'https://inv.wtf/{code}',
					'inviteurl': f'https://discord.gg/{invite}'
				}
		self.bot.logger.info(f'$GREENLoaded vanity urls & redirects!')

	async def loadtags(self):
		await self.bot.wait_until_ready()
		self.bot.logger.info(f'$YELLOWLoading tags...')
		self.tags = {}
		query = 'SELECT * FROM tags;'
		taglist = await self.bot.db.fetch(query)
		for t in taglist:
			guild = t['gid']
			tagname = t['name'].lower()
			content = t['content']
			if guild not in self.tags:
				self.tags[guild] = {}
			self.tags[guild][tagname] = content
		self.bot.logger.info(f'$GREENLoaded tags!')

	async def loadbans(self):
		await self.bot.wait_until_ready()
		self.bot.logger.info(f'$YELLOWLoading bans...')
		self.bans = {}
		for g in [guild for guild in self.bot.guilds if guild.me.guild_permissions.ban_members]:
			bans = await g.bans()
			self.bans[g.id] = [b.user.id for b in bans]
		self.bot.logger.info(f'$GREENLoaded bans!')

	@commands.Cog.listener()
	async def on_member_ban(self, guild, member):
		if guild.id in self.bans:
			self.bans[guild.id].append(member.id)
		else:
			self.bans[guild.id] = [member.id]

	@commands.Cog.listener()
	async def on_member_unban(self, guild, member):
		if guild.id in self.bans:
			self.bans[guild.id].remove(member.id)

	async def loadremind(self):
		await self.bot.wait_until_ready()
		self.bot.logger.info(f'$YELLOWLoading reminders...')
		self.reminders = {}
		query = 'SELECT * FROM remind;'
		reminders = await self.bot.db.fetch(query)
		for r in reminders:
			user = r['uid']
			forwhen = r['forwhen']
			reminder = r['reminder']
			if user not in self.reminders:
				self.reminders[user] = []
			self.reminders[user].append({'for': forwhen, 'reminder': reminder})
		self.bot.logger.info(f'$GREENLoaded reminders!')

	async def deleteremind(self, uid: int, forwhen: int):
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM remind WHERE uid = $1 AND forwhen = $2;'
			await self.bot.db.execute(query, uid, forwhen)
		await self.bot.db.release(con)
		await self.loadremind()

	def cog_unload(self):
		self.remindcheck.cancel()

	@tasks.loop(seconds=1)
	async def remindcheck(self):
		reminders = self.reminders.copy()
		fornow = datetime.datetime.utcnow().timestamp()
		try:
			for u in reminders:
				user = self.reminders[u]
				for r in user:
					reminder = r['reminder']
					if r['for'] <= fornow:
						quotes = []
						if 'discordapp.com/channels/' in reminder:
							for i in reminder.split():
								word = i.lower()
								urlbranch = None
								if word.startswith('https://canary.discordapp.com/channels/'):
									urlbranch = 'canary.'
									word = word.strip('https://canary.discordapp.com/channels/')
								elif word.startswith('https://ptb.discordapp.com/channels/'):
									urlbranch = 'ptb.'
									word = word.strip('https://ptb.discordapp.com/channels/')
								elif word.startswith('https://discordapp.com/channels/'):
									urlbranch = ''
									word = word.strip('https://discordapp.com/channels/')
								else:
									continue
								list_ids = word.split('/')
								if len(list_ids) == 3 and urlbranch is not None:
									try:
										message = await self.bot.http.get_message(list_ids[1], list_ids[2])
										channel = self.bot.get_channel(int(message["channel_id"]))
										if isinstance(channel, discord.TextChannel):
											m = channel.guild.get_member(u)
											if not m:
												pass
											if m.permissions_in(channel).read_messages:
												fullurl = f'https://{urlbranch}discordapp.com/channels/{list_ids[0]}/{list_ids[1]}/{list_ids[2]}'
												reminder = reminder.replace(f'{fullurl}/', '').replace(fullurl, '').replace('<>', '')
												quotes.append(f'"{message["content"]}" (<{fullurl}>)'.replace(f'{message["content"]}/', message["content"]))
									except Exception as e:
										if isinstance(e, discord.HTTPException):
											pass
										else:
											self.bot.logger.warn(f'$YELLOWSomething went wrong when trying to remind someone', exc_info=e)
											# print('\n'.join(traceback.format_exception(type(e), e, e.__traceback__)))
						tosend = self.bot.get_user(u)
						await self.deleteremind(u, r['for'])
						try:
							if quotes:
								if len(quotes) == 1:
									quotes = f'You also quoted {quotes[0]}'
								else:
									quotes = 'You also quoted these messages...\n' + '\n'.join(quotes)
								await tosend.send(f'You wanted me to remind you about "{reminder}"\n\n{quotes}')
							else:
								await tosend.send(f'You wanted me to remind you about "{reminder}"')
						except discord.Forbidden:
							continue # How sad, no reminder for you.
						except Exception as e:
							self.bot.logger.warn(f'$YELLOWTried to send reminder to {tosend} but an exception occured (and no, it wasn\'t forbidden)', exc_info=e)
							# print('\n'.join(traceback.format_exception(type(e), e, e.__traceback__)))
		except Exception as e:
			self.bot.logger.warn(f'$YELLOWSomething went wrong in the reminder check', exc_info=e)
			# print('\n'.join(traceback.format_exception(type(e), e, e.__traceback__)))

	# @commands.Cog.listener()
	# async def on_ready(self):
	# 	await asyncio.sleep(5)
	# 	await self.loadvanitys()
	# 	await self.loadtags()
	# 	await self.loaddescs()
	# 	await self.loadremind()
	# 	print('Utilities loaded!')

	@commands.command(name='plonk', description='Add someone to the blacklist', hidden=True)
	async def blacklist_add(self, ctx, user: UserWithFallback = None, reason: str = 'bad boi', permanent: bool = False):
		if not self.bot.isadmin(ctx.author):
			return
		if user is None:
			await ctx.send('You need to provide a user to add to the blacklist!')
		else:
			query = 'SELECT * FROM blacklist WHERE uid = $1;'
			blraw = await self.bot.db.fetch(query, user.id)
			if not blraw:
				if permanent:
					permanent = 1
				else:
					permanent = 0
				# await self.bot.db.execute(f'INSERT INTO blacklist (\"user\", \"uid\", \"reason\", \"perm\") VALUES (\"{user}\", {user.id}, \"{reason}\", {permanent});')
				# await self.bot.conn.commit()
				con = await self.bot.db.acquire()
				async with con.transaction():
					query = 'INSERT INTO blacklist ("user", uid, reason, perm) VALUES ($1, $2, $3, $4);'
					await self.bot.db.execute(query, user.name, user.id, reason, permanent)
				await self.bot.db.release(con)
				star_chat = self.bot.get_channel(624304772333436928)
				await star_chat.send(f'{user} was blacklisted by {ctx.author} with the reason "{reason}". Permanent: {bool(permanent)}')
				await ctx.send(f'{user.mention} was successfully blacklisted!')
			else:
				blid = blraw[0]['uid']
				if permanent:
					permanent = 1
				else:
					permanent = 0
				# await self.bot.db.execute(f'UPDATE blacklist SET user = \"{user}\", uid = {user.id}, reason = \"{reason}\", perm = {permanent} WHERE id = {blid};')
				# await self.bot.conn.commit()
				con = await self.bot.db.acquire()
				async with con.transaction():
					query = 'UPDATE blacklist SET user=$1, uid=$2, reason=$3, perm=$4 WHERE uid=$5;'
					await self.bot.db.execute(query, user.name, user.id, reason, permanent, blid)
				await self.bot.db.release(con)
				star_chat = self.bot.get_channel(624304772333436928)
				await star_chat.send(f'{user}\'s blacklist was updated by {ctx.author} to reason "{reason}". Permanent: {bool(permanent)}')
				await ctx.send(f'Blacklist entry updated for {user.mention}.')
			self.bot.plonked = await self.bot.get_cog("Miscellaneous").loadplonked()

	@commands.command(name='unplonk', description='Remove someone from the blacklist', hidden=True)
	async def blacklist_remove(self, ctx, user: UserWithFallback = None):
		if not self.bot.isadmin(ctx.author):
			return
		if user is None:
			await ctx.send('You need to provide a user to remove from the blacklist!')
		else:
			query = 'SELECT * FROM blacklist WHERE uid = $1;'
			blraw = await self.bot.db.fetch(query, user.id)
			if not blraw:
				await ctx.send(f'{user.mention} is not blacklisted.')
				return
			else:
				# await self.bot.db.execute(f'DELETE FROM blacklist WHERE uid = {user.id};')
				# await self.bot.conn.commit()
				con = await self.bot.db.acquire()
				async with con.transaction():
					query = 'DELETE FROM blacklist WHERE uid = $1;'
					await self.bot.db.execute(query, user.id)
				await self.bot.db.release(con)
				await ctx.send(f'{user.mention} is now unblacklisted!')
				star_chat = self.bot.get_channel(624304772333436928)
				await star_chat.send(f'{user} was unblacklisted by {ctx.author}')
			self.bot.plonked = await self.bot.get_cog("Miscellaneous").loadplonked()

	featureslist = {
		'PARTNERED': '[Partnered](https://dis.gd/partners)',
		'VERIFIED': '[Verified](https://dis.gd/verified)',
		'COMMERCE': '[Store Channels](https://dis.gd/sell-your-game)',
		'NEWS': '[Announcement Channels](https://support.discordapp.com/hc/en-us/articles/360032008192)',
		'FEATURABLE': '[Featurable](https://discordapp.com/activity)',
		'DISCOVERABLE': '[Discoverable](https://discordapp.com/guild-discovery) [(Discoverable Guidelines)](https://support.discordapp.com/hc/en-us/articles/360035969312)',
		'ENABLED_DISCOVERABLE_BEFORE': 'Enabled Discoverable Before',
		'PUBLIC': '[Public](https://support.discordapp.com/hc/en-us/articles/360035969312-Public-Server-Guidelines)',
		'WELCOME_SCREEN_ENABLED': 'Welcome Screen',
		'VANITY_URL': 'Vanity URL',
		'ANIMATED_ICON': 'Animated Icon',
		'BANNER': 'Banner',
		'INVITE_SPLASH': 'Invite Splash',
		'MORE_EMOJI': 'More Emoji',
		'VIP_REGIONS': 'VIP Regions (Deprecated)',
		'RELAY_ENABLED': 'Relay Enabled (?)',
		# CUSTOM FEATURES
		'PREMIUM': '<:firelogo:665339492072292363> [Premium](https://gaminggeek.dev/premium)'
	}

	@commands.group(name='info', invoke_without_command=True)
	@commands.guild_only()
	async def infogroup(self, ctx):
		embed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
		embed.set_author(name=ctx.guild.name, icon_url=str(ctx.guild.icon_url))
		embed.add_field(name='Info Commands', value=f'> {ctx.prefix}info guild | Get\'s info about the guild\n> {ctx.prefix}info user [<user>] | Get\'s info about you or another user\n> {ctx.prefix}info role [<role>] | Get\'s info about your top role or another role', inline=False)
		await ctx.send(embed=embed)

	@infogroup.command(name='guild', description='Check out the guild\'s info', aliases=['server'])
	async def infoguild(self, ctx, gid: int = None):
		if gid and gid != ctx.guild.id:
			preview = await aiohttp.ClientSession().get(f'https://api.gaminggeek.dev/preview/{gid}')
			if preview.status != 200:
				return await ctx.error(f'HTTP ERROR {preview.status}: That guild could not be found! It must be public for me to show it.')
			preview = await preview.json()
			embed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
			embed.set_thumbnail(url=preview['icon'])
			nameemote = ''
			if 'PARTNERED' in preview['features']:
				nameemote = discord.utils.get(self.bot.emojis, id=647400542775279629)
			elif 'VERIFIED' in preview['features']:
				nameemote = discord.utils.get(self.bot.emojis, id=647400543018287114)
			embed.add_field(name="» Name", value=f'{preview["name"]} {nameemote}', inline=False)
			embed.add_field(name="» ID", value=gid, inline=False)
			embed.add_field(name="» Members", value=f'⬤ {preview["approximate_presence_count"]:,d} Online & ⭘ {preview["approximate_member_count"]:,d} Members', inline=False)
			embed.add_field(name="» Description", value=preview['description'] or 'No description set.', inline=False)
			embed.add_field(name="» Created", value=humanfriendly.format_timespan(datetime.datetime.utcnow() - discord.utils.snowflake_time(gid), max_units=2) + ' ago', inline=True)
			features = ', '.join([self.featureslist.get(f, f) for f in preview['features']])
			if features and features != '':
				embed.add_field(name="» Features", value=features, inline=False)
			if preview['discovery_splash'] or preview['splash']:
				embed.add_field(name="» Splash", value=preview['discovery_splash'] or preview['splash'], inline=False)
				embed.set_image(url=preview['discovery_splash'] or preview['splash'])
			return await ctx.send(embed=embed)
		guild = ctx.guild
		embed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
		embed.set_thumbnail(url=guild.icon_url)
		nameemote = ''
		if 'PARTNERED' in guild.features:
			nameemote = discord.utils.get(self.bot.emojis, id=647400542775279629)
		elif 'VERIFIED' in guild.features:
			nameemote = discord.utils.get(self.bot.emojis, id=647400543018287114)
		embed.add_field(name="» Name", value=f'{guild.name} {nameemote}', inline=False)
		embed.add_field(name="» ID", value=guild.id, inline=False)
		embed.add_field(name="» Members", value=format(guild.member_count, ',d'), inline=False)
		announcech = [c for c in guild.text_channels if c.is_news()]
		storech = [c for c in guild.channels if str(c.type) == 'store']
		embed.add_field(name="» Channels", value=f"Text: {len(guild.text_channels) - len(announcech)} | Voice: {len(guild.voice_channels)}\nAnnouncement: {len(announcech)}\nStore: {len(storech)}", inline=True)
		embed.add_field(name="» Owner", value=str(guild.owner), inline=True)
		embed.add_field(name="» Region", value=region[str(guild.region)], inline=True)
		embed.add_field(name="» Verification", value=str(guild.verification_level).capitalize(), inline=True)
		embed.add_field(name="» Notifications", value=notifs[str(guild.default_notifications)], inline=True)
		embed.add_field(name="» Multi-Factor Auth", value=bool(guild.mfa_level), inline=True)
		embed.add_field(name="» Created", value=humanfriendly.format_timespan(datetime.datetime.utcnow() - guild.created_at, max_units=2) + ' ago', inline=True)
		features = ', '.join([self.featureslist.get(f, f) for f in guild.features])
		if features and features != '':
			embed.add_field(name="» Features", value=features, inline=False)
		roles = []
		for role in guild.roles:
			if role.is_default():
				pass
			else:
				roles.append(role.mention)
		roles = ' - '.join(roles)
		if len(roles) <= 1000:
			embed.add_field(name="» Roles", value=roles, inline=False)
			await ctx.send(embed=embed)
		else:
			rolebed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.utcnow(), description=f'**Roles**\n{roles}')
			await ctx.send(embed=embed)
			try:
				await ctx.send(embed=rolebed)
			except Exception:
				return  # No roles for you : (

	@infogroup.command(name='user', description='Check out a user\'s info')
	async def infouser(self, ctx, *, user: typing.Union[Member, UserWithFallback] = None):
		if not user:
			user = ctx.author
		if type(user) == discord.ClientUser:
			user = ctx.guild.me
		if type(user) == discord.User:
			color = ctx.author.color
		elif type(user) == discord.Member:
			color = user.color
		if ctx.guild and ctx.guild.get_member(user.id):
			user = ctx.guild.get_member(user.id)
		badges = [u'\u200b']
		for guild in self.bot.guilds:
			if guild.owner_id == user.id and 'PARTNERED' in guild.features:
				badges.append(str(discord.utils.get(self.bot.emojis, id=631831109575114752)))
		if self.bot.isadmin(user):
			badges.append(str(discord.utils.get(self.bot.emojis, id=671243744774848512)))
		if len(badges) > 1:
			embed = discord.Embed(title=f'{user} ({user.id})', colour=color, timestamp=datetime.datetime.utcnow(), description=''.join(badges))
		else:
			embed = discord.Embed(title=f'{user} ({user.id})', colour=color, timestamp=datetime.datetime.utcnow())
		embed.set_thumbnail(url=str(user.avatar_url_as(static_format='png', size=2048)))
		if ctx.guild and type(user) == discord.Member:
			members = sorted(ctx.guild.members, key=lambda m: m.joined_at or m.created_at)
			embed.add_field(name="» Join Position", value=members.index(user) + 1, inline=False)
		embed.add_field(name="» Created", value=humanfriendly.format_timespan(datetime.datetime.utcnow() - user.created_at, max_units=2) + ' ago', inline=False)
		if type(user) == discord.Member:
			if user.nick:
				embed.add_field(name="» Nickname", value=user.nick, inline=False)
			if user.premium_since:
				embed.add_field(name="» Boosting For", value=humanfriendly.format_timespan(datetime.datetime.utcnow() - user.premium_since), inline=False)
			roles = []
			for role in user.roles:
				if role.is_default():
					pass
				else:
					roles.append(role.mention)
			embed.add_field(name="» Roles", value=' - '.join(roles) or 'No roles', inline=False)
		if not user.bot:
			trust = 'High' # yes ravy I'm stealing your trust thing. go check out ravy, https://ravy.xyz/
			if self.bans:
				guildbans = 0
				for g in self.bans:
					guild = self.bot.get_guild(g)
					if user.id in self.bans[g] and guild.member_count >= 50:
						guildbans += 1
				if guildbans == 0:
					lban = '<:check:674359197378281472> Not banned in any guilds with Fire'
				elif guildbans < 5:
					trust = 'Moderate'
					lban = f'<a:fireWarning:660148304486727730> Banned in **{guildbans}** guilds with Fire'
				elif guildbans >= 5:
					trust = 'Low'
					lban = f'<:xmark:674359427830382603> Banned in **{guildbans}** guilds with Fire'
				if self.bot.isadmin(user):
					trust = 'High'
					lban = '<:check:674359197378281472> Hidden from guild ban check'
			else:
				lban = f'<:neutral:674359530074669076> Guild bans not loaded'
			try:
				ksoftban = await self.bot.ksoft.bans_check(user.id)
				if ksoftban:
					if trust == 'Low':
						trust = 'Very Low'
					else:
						trust = 'Low'
					ksoftban = await self.bot.ksoft.bans_info(user.id)
					gban = f'<:xmark:674359427830382603> Banned on [KSoft.Si](https://bans.ksoft.si/share?user={user.id}) for {ksoftban.reason} - [Proof]({ksoftban.proof})'
				else:
					gban = f'<:check:674359197378281472> Not banned on [KSoft.Si](https://bans.ksoft.si/share?user={user.id})'
			except Exception:
				gban = '<:neutral:674359530074669076> Failed to retrieve global ban info'
			embed.add_field(name=f'» Trust - {trust} (Idea from aero.bot)', value='\n'.join([lban, gban]), inline=False)
		ack = self.bot.acknowledgements.get(user.id, []) if hasattr(self.bot, 'acknowledgements') else []
		if ack:
			embed.add_field(name='» Recognized User', value=', '.join(ack), inline=False)
		if user.id in self.bot.aliases.get('hasalias', []) and any(ctx.message.content.lower().endswith(f'info user {a}') for a in [b for b in self.bot.aliases if b != 'hasalias' and self.bot.aliases[b] == user.id]):
			aliases = [a for a in self.bot.aliases if a != 'hasalias' and self.bot.aliases[a] == user.id]
			embed.add_field(name='» Aliases', value=', '.join(aliases) + '\n\nNot the right user? Use their name and discriminator, id or mention to bypass aliases', inline=False)
		await ctx.send(embed=embed)

	@infogroup.command(description='Check out a role\'s info')
	async def role(self, ctx, *, role: Role = None):
		if not role:
			role = ctx.author.top_role
		embed = discord.Embed(colour=role.color if role.color != discord.Color.default() else ctx.author.color, timestamp=datetime.datetime.utcnow())
		embed.add_field(name="» Name", value=role.name, inline=True)
		embed.add_field(name="» ID", value=role.id, inline=True)
		embed.add_field(name="» Mention", value=f'`{role.mention}`', inline=True)
		embed.add_field(name="» Members", value=len(role.members), inline=True)
		rgbcolor = role.color.to_rgb()
		hexcolor = rgb2hex(role.color.r, role.color.g, role.color.b).replace('##', '#')
		embed.add_field(name="» Hoisted?", value='Yes' if role.hoist else 'No', inline=True)
		embed.add_field(name="» Mentionable?", value='Yes' if role.mentionable else 'No', inline=True)
		embed.add_field(name="» Color", value=f'> RGB: {rgbcolor}\n> HEX: {hexcolor}', inline=True)
		perms = []
		if not role.permissions.administrator:
			for perm, value in role.permissions:
				if value and perm in permissions:
					perms.append(permissions[perm])
			if perms:
				embed.add_field(name="» Key Permissions", value=', '.join(perms), inline=False)
		else:
			embed.add_field(name="» Permissions", value='Administrator', inline=False)
		await ctx.send(embed=embed)
		if role.members:
			paginator = WrappedPaginator(prefix='', suffix='', max_size=250)
			for member in role.members:
				paginator.add_line(member.mention)
			membed = discord.Embed(colour=role.color if role.color != discord.Color.default() else ctx.author.color, timestamp=datetime.datetime.utcnow())
			interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=membed)
			await interface.send_to(ctx)

	@commands.command(name='dstatus')
	async def dstatus(self, ctx):
		colors = {
			'none': ctx.author.color,
			'minor': discord.Color.gold(),
			'major': discord.Color.orange(),
			'critical': discord.Color.red(),
			'maintenance': discord.Color.blue()
		}
		emoji = {
			'operational': '<:operational:685538400639385649>',
			'degraded_performance': '<:degraded_performance:685538400228343808>',
			'partial_outage': '<:partial_outage:685538400555499675>',
			'major_outage': '<:major_outage:685538400639385706>',
			'under_maintenance': '<:maintenance:685538400337395743>'
		}
		summary = await aiohttp.ClientSession().get('https://status.discordapp.com/api/v2/summary.json')
		summary = await summary.json()
		incidents = await aiohttp.ClientSession().get('https://status.discordapp.com/api/v2/incidents.json')
		incidents = await incidents.json()
		desc = []
		groups = {}
		for c in [c for c in summary['components'] if c['group_id']]:
			if c['group_id'] == 'jk03xttfcz9b' and c['status'] == 'operational':
				continue
			if c['group_id'] not in groups:
				groups[c['group_id']] = [c]
			else:
				groups[c['group_id']].append(c)
		for c in [c for c in summary['components'] if not c['group_id']]:
			desc.append(f'├{emoji[c["status"]]} **{c["name"]}**: {c["status"].replace("_", " ").title()}')
			for s in groups.get(c['id'], []):
				desc.append(f'├─{emoji[s["status"]]} **{s["name"]}**: {s["status"].replace("_", " ").title()}')
		embed = discord.Embed(color=colors[str(summary['status']['indicator'])], title=summary['status']['description'], timestamp=datetime.datetime.utcnow(), description='\n'.join(desc))
		incident = incidents['incidents'][0]
		embed.add_field(name='Latest Incident', value=f'[{incident["name"]}]({incident["shortlink"]})\nStatus: **{incident["status"].capitalize()}**')
		await ctx.send(embed=embed)

	@commands.command(name='status')
	async def status(self, ctx):
		colors = {
			'none': ctx.author.color,
			'minor': discord.Color.gold(),
			'major': discord.Color.orange(),
			'critical': discord.Color.red(),
			'maintenance': discord.Color.blue()
		}
		emoji = {
			'operational': '<:operational:685538400639385649>',
			'degraded_performance': '<:degraded_performance:685538400228343808>',
			'partial_outage': '<:partial_outage:685538400555499675>',
			'major_outage': '<:major_outage:685538400639385706>',
			'under_maintenance': '<:maintenance:685538400337395743>'
		}
		summary = await aiohttp.ClientSession().get('https://status.gaminggeek.dev/api/v2/summary.json')
		summary = await summary.json()
		incidents = await aiohttp.ClientSession().get('https://status.gaminggeek.dev/api/v2/incidents.json')
		incidents = await incidents.json()
		desc = []
		groups = {}
		for c in [c for c in summary['components'] if c['group_id']]:
			if c['group_id'] == 'jmsbww1qjnz5' and c['status'] == 'operational':
				continue
			if c['group_id'] not in groups:
				groups[c['group_id']] = [c]
			else:
				groups[c['group_id']].append(c)
		for c in [c for c in summary['components'] if not c['group_id']]:
			desc.append(f'├{emoji[c["status"]]} **{c["name"]}**: {c["status"].replace("_", " ").title()}')
			for s in groups.get(c['id'], []):
				desc.append(f'├─{emoji[s["status"]]} **{s["name"]}**: {s["status"].replace("_", " ").title()}')
		embed = discord.Embed(color=colors[str(summary['status']['indicator'])], title=summary['status']['description'], timestamp=datetime.datetime.utcnow(), description='\n'.join(desc))
		incident = incidents['incidents'][0]
		embed.add_field(name='Latest Incident', value=f'[{incident["name"]}]({incident["shortlink"]})\nStatus: **{incident["status"].capitalize()}**', inline=False)
		maintenance = summary.get('scheduled_maintenances', [])
		if len(maintenance) >= 1:
			maintenance = maintenance[0]
			embed.add_field(name='Scheduled Maintenance', value=f'[{maintenance["name"]}]({maintenance["shortlink"]})\nStatus: **{maintenance["status"].replace("_", " ").capitalize()}**', inline=False)
		await ctx.send(embed=embed)

	@commands.command(description='Bulk delete messages', aliases=['prune'])
	@commands.has_permissions(manage_messages=True)
	async def purge(self, ctx, amount: int = -1, *, opt: flags.FlagParser(
		user=User,
		match=str,
		nomatch=str,
		startswith=str,
		endswith=str,
		attachments=bool,
		bot=bool,
		invite=bool,
		text=bool,
		channel=TextChannel,
		reason=str
	) = flags.EmptyFlags):
		if amount>500 or amount<0:
			return await ctx.send('Invalid amount. Minumum is 1, Maximum is 500')
		try:
			await ctx.message.delete()
		except Exception:
			pass
		channel = ctx.channel
		if isinstance(opt, dict):
			user = opt['user']
			match = opt['match']
			nomatch = opt['nomatch']
			startswith = opt['startswith']
			endswith = opt['endswith']
			attachments = opt['attachments']
			bot = opt['bot']
			invite = opt['invite']
			text = opt['text']
			channel = opt['channel'] or ctx.channel
			reason = opt['reason'] or 'No Reason Provided'
			def purgecheck(m):
				completed = []
				if user:
					completed.append(m.author.id == user.id)
				if match:
					completed.append(match in m.content)
				if nomatch:
					completed.append(nomatch not in m.content)
				if startswith:
					completed.append(m.content.startswith(startswith))
				if endswith:
					completed.append(m.content.endswith(endswith))
				if attachments:
					completed.append(len(m.attachments) >= 1)
				if bot:
					completed.append(m.author.bot)
				elif bot == False: # not includes None meaning "not bot" would be triggered if not included
					completed.append(not m.author.bot)
				if invite:
					completed.append(findinvite(m.content))
				if text == False: # same as bot
					completed.append(not m.content)
				return len([c for c in completed if not c]) == 0
			amount += 1
			self.bot.recentpurge[ctx.channel.id] = []
			self.bot.recentpurge[f'{ctx.channel.id}-reason'] = reason
			async for message in channel.history(limit=amount):
				if purgecheck(message):
					self.bot.recentpurge[ctx.channel.id].append({
						'author': str(message.author),
						'author_id': message.author.id,
						'content': message.system_content or '',
						'bot': message.author.bot,
						'embeds': [e.to_dict() for e in message.embeds]
					})
			try:
				await channel.purge(limit=amount, check=purgecheck)
			except discord.NotFound:
				return await ctx.error(f'I couldn\'t delete some messages, maybe you set the amount too high?')
		else:
			self.bot.recentpurge[ctx.channel.id] = []
			async for message in ctx.channel.history(limit=amount):
				self.bot.recentpurge[ctx.channel.id].append({
					'author': str(message.author),
					'author_id': message.author.id,
					'content': message.system_content or '',
					'bot': message.author.bot,
					'embeds': [e.to_dict() for e in message.embeds]
				})
			try:
				await ctx.channel.purge(limit=amount)
			except discord.NotFound:
				return await ctx.error(f'I couldn\'t delete some messages, maybe you set the amount too high?')
		await channel.send(f'Successfully deleted **{len(self.bot.recentpurge[ctx.channel.id])}** messages!', delete_after=5)

	@commands.Cog.listener()
	async def on_message(self, message):
		if self.bot.dev:
			return
		if '--remind' in message.content.lower():
			if message.channel in self.bot.configs[message.guild.id].get('commands.modonly'):
				if not message.author.permissions_in(message.channel).manage_messages:
					return
			if message.channel in self.bot.configs[message.guild.id].get('commands.adminonly'):
				if not message.author.permissions_in(message.channel).manage_guild:
					return
			content = message.content.lower().replace(' --remind', '').replace('--remind ', '').replace('--remind', '') # Make sure --remind is replaced with space before, after, both or none
			ctx = await self.bot.get_context(message)
			alt_ctx = await copy_context_with(ctx, content=self.bot.configs[message.guild.id].get('main.prefix') + f'remind {content}')
			if not alt_ctx.valid:
				return
			return await alt_ctx.command.invoke(alt_ctx)

	@commands.command(description='Got a HTTP Error Code? My cat knows what it means.', name='http.cat')
	async def httpcat(self, ctx, error: int = 200):
		embed = discord.Embed(color=ctx.author.color)
		embed.set_image(url=f'https://http.cat/{error}')
		await ctx.send(embed=embed)

	@commands.command(description='Get the amount of members in the server', aliases=['members'])
	async def membercount(self, ctx):
		embed = discord.Embed(color=ctx.author.color)
		embed.set_author(name=ctx.guild.name, icon_url=str(ctx.guild.icon_url))
		embed.add_field(name='Total', value=format(len(ctx.guild.members), ',d'), inline=False)
		embed.add_field(name='Humans', value=format(len([m for m in ctx.guild.members if not m.bot]), ',d'), inline=False)
		embed.add_field(name='Bots', value=format(len([m for m in ctx.guild.members if m.bot]), ',d'), inline=False)
		await ctx.send(embed=embed)

	@commands.command(description='Get a user\'s avatar', aliases=['av'])
	async def avatar(self, ctx, user: UserWithFallback = None):
		if not user:
			user = ctx.author
		if ctx.guild:
			member = ctx.guild.get_member(user.id)
		if member:
			embed = discord.Embed(color=member.color)
		else:
			embed = discord.Embed(color=ctx.author.color)
		embed.set_image(url=str(user.avatar_url_as(static_format='png', size=2048)))
		await ctx.send(embed=embed)

	@commands.command(aliases=['desc'], description='Sets the guild\'s description')
	@commands.has_permissions(manage_guild=True)
	async def description(self, ctx, *, desc: str = None):
		if not desc:
			await self.bot.configs[ctx.guild.id].set('main.description', '')
			return await ctx.success(f'Successfully reset guild description!')
		await self.bot.configs[ctx.guild.id].set('main.description', desc)
		return await ctx.success(f'Successfully set guild description!')

	@commands.command(aliases=['remind', 'reminder'], description='Sets a reminder for a time in the future')
	async def remindme(self, ctx, *, reminder: str):
		if parseTime(reminder):
			days, hours, minutes, seconds = parseTime(reminder)
			reminder = parseTime(reminder, True)
			if not reminder.replace(' ', '') or not reminder:
				return await ctx.error('Invalid format. Please provide a reminder along with the time')
		else:
			return await ctx.error('Invalid format. Please use the format "DAYSd HOURSh MINUTESm SECONDSs" along with your reminder')
		if not days and not hours and not minutes and not seconds:
			return await ctx.error('Invalid format. Please provide a time')
		forwhen = datetime.datetime.utcnow() + datetime.timedelta(days=days, seconds=seconds, minutes=minutes, hours=hours)
		limit = datetime.datetime.utcnow() + datetime.timedelta(days=32) # 32 to account for extra time on 31st day, e.g. 31 days 2 hours
		if forwhen > limit and not await self.bot.is_owner(ctx.author):
			return await ctx.error('Reminders currently cannot be set for more than 1 month (31 days)')
		if ctx.author.id not in self.reminders:
			try:
				await ctx.author.send('Hey, I\'m just checking to see if I can DM you as this is where I will send your reminder :)')
			except discord.Forbidden:
				return await ctx.error('I was unable to DM you.\nI send reminders in DMs so you must make sure "Allow direct messages from server members." is enabled in at least one mutual server')
		reminder = reminder.strip()
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'INSERT INTO remind (\"uid\", \"forwhen\", \"reminder\") VALUES ($1, $2, $3);'
			await self.bot.db.execute(query, ctx.author.id, forwhen.timestamp(), reminder)
		await self.bot.db.release(con)
		await self.loadremind()
		return await ctx.success(f'Reminder set for {humanfriendly.format_timespan(datetime.timedelta(days=days, seconds=seconds, minutes=minutes, hours=hours))} from now')

	@commands.command(description='Creates a vanity invite for your Discord using https://inv.wtf/')
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def vanityurl(self, ctx, code: str = None):
		premiumguilds = self.bot.premiumGuilds
		current = self.bot.get_vanity_gid(ctx.guild.id)
		if not code and (not ctx.guild.id in premiumguilds or not current):
			return await ctx.error('You need to provide a code!')
		elif not code and current:
			statuses = ['online', 'idle', 'dnd']
			online = len([m for m in ctx.guild.members if str(m.status) in statuses])
			gonline = f'⬤ {online:,d} Online'
			gmembers = f'⭘ {len(ctx.guild.members):,d} Members'
			desc = self.bot.configs[ctx.guild.id].get('main.description') or f'Check out {ctx.guild} on Discord'
			desc = f'[{ctx.guild}]({current.get("url", "https://inv.wtf/")})\n{desc}\n\n{gonline} & {gmembers}'
			embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.utcnow(), description=desc)
			attach = None
			if not ctx.guild.splash_url and not ctx.guild.banner_url and not ctx.guild.id == 564052798044504084:
				embed.set_thumbnail(url=str(ctx.guild.icon_url))
			else:
				image = ctx.guild.splash_url or ctx.guild.banner_url
				if 'PARTNERED' in ctx.guild.features or 'VERIFIED' in ctx.guild.features:
					if ctx.guild.splash_url:
						splashraw = await ctx.guild.splash_url.read()
					elif ctx.guild.banner_url:
						splashraw = await ctx.guild.banner_url.read()
					if splashraw:
						if 'PARTNERED' in ctx.guild.features:
							badge = await aiohttp.ClientSession().get('https://cdn.discordapp.com/emojis/647415490226159617.png?size=32')
							badgeraw = await badge.read()
						elif 'VERIFIED' in ctx.guild.features:
							badge = await aiohttp.ClientSession().get('https://cdn.discordapp.com/emojis/647415489764524062.png?size=32')
							badgeraw = await badge.read()
						s = Image.open(BytesIO(splashraw))
						s = s.resize((320, 180))
						if badgeraw:
							b = Image.open(BytesIO(badgeraw))
							s.paste(b, (6, 6), b)
						buf = BytesIO()
						s.save(buf, format='PNG')
						buf.seek(0)
						attach = discord.File(buf, 'splashyboi.png')
						image = 'attachment://splashyboi.png'
				if ctx.guild.id == 564052798044504084:
					image = 'https://cdn.discordapp.com/app-assets/444871677176709141/store/630360840251506742.png?size=320'
					#please join my discord and boost so I can get an invite splash, https://inv.wtf/firebot thank
				embed.set_image(url=str(image))
			embed.add_field(name='Clicks', value=current['clicks'])
			embed.add_field(name='Links', value=current['links'])
			embed.add_field(name='URL', value=current['url'], inline=False)
			if attach:
				return await ctx.send(embed=embed, file=attach)
			else:
				return await ctx.send(embed=embed)
		if code.lower() == 'disable':
			await self.deletevanity(ctx)
			return await ctx.success('Vanity URL deleted!')
		if not re.fullmatch(r'[a-zA-Z0-9]+', code):
			return await ctx.error('Vanity URLs can only contain characters A-Z0-9')
		if len(code) < 3 or len(code) > 10:
			return await ctx.error('The code needs to be 3-10 characters!')
		exists = self.bot.get_vanity(code.lower())
		redirexists = self.bot.get_redirect(code.lower())
		if exists or redirexists:
			return await ctx.error('This code is already in use!')
		if not ctx.guild.me.guild_permissions.create_instant_invite:
			raise commands.BotMissingPermissions(['create_instant_invite'])
		if ctx.guild.me.guild_permissions.manage_guild and 'VANITY_URL' in ctx.guild.features:
			createdinv = await ctx.guild.vanity_invite()
		else:
			createdinv = await ctx.channel.create_invite(reason='Creating invite for Vanity URL')
		vanity = await self.createvanity(ctx, code.lower(), createdinv)
		if vanity:
			author = str(ctx.author).replace('#', '%23')
			if not self.bot.dev:
				try:
					slackmsg = await slack.sendvanity(f'/{code}', ctx.author, ctx.guild)
					self.bot.slack_messages[f'vanity_{ctx.guild.id}'] = slackmsg
				except PushError as e:
					self.bot.logger.error(f'$REDUnable to send Vanity URL to Slack!', exc_info=e)
					if 'vanityapiurl' not in config:
						config['vanityurlapi'] = 'https://http.cat/404'
					await pushover(f'{author} ({ctx.author.id}) has created the Vanity URL `{vanity["url"]}` for {ctx.guild.name}', url=config['vanityurlapi'], url_title='Check current Vanity URLs')
			else:
				await pushover(f'{author} ({ctx.author.id}) has created the Vanity URL `{vanity["url"]}` for {ctx.guild.name}', url=config['vanityurlapi'], url_title='Check current Vanity URLs')
			return await ctx.success(f'Your Vanity URL is https://inv.wtf/{code}')
		else:
			return await ctx.error('Something went wrong...')

	@commands.command(name='redirect', description='Creates a custom redirect for a URL using https://inv.wtf/')
	@commands.has_permissions(administrator=True)
	@commands.guild_only()
	async def makeredirect(self, ctx, slug: str = None, url: str = None, delete: bool = False):
		premiumguilds = self.bot.premiumGuilds
		if not ctx.guild.id in premiumguilds:
			return await ctx.error('This feature is premium only! You can learn more at <https://gaminggeek.dev/premium>')
		if not slug:
			return await ctx.error('You must provide a slug!')
		if not url:
			return await ctx.error('You must provide a url!')
		if url.lower() in ['remove', 'delete', 'true', 'yeet', 'disable']:
			delete = True
		if delete:
			current = self.get_redirect(slug.lower())
			if current['uid'] != ctx.author.id:
				return await ctx.error('You can only delete your own redirects!')
			await self.deletevanitycode(slug.lower())
			return await ctx.success('Redirect deleted!')
		if 'https://' not in url:
			return await ctx.error('URL must include "https://"')
		if findinvite(url):
			return await ctx.error('Redirects cannot be used for invite links')
		if not re.fullmatch(r'[a-zA-Z0-9]+', slug):
			return await ctx.error('Redirect slugs can only contain characters A-Z0-9')
		if len(slug) < 3 or len(slug) > 20:
			return await ctx.error('The slug needs to be 3-20 characters!')
		exists = self.bot.get_vanity(slug.lower())
		if exists and exists['gid'] not in premiumguilds:
			exists = False
		redirexists = self.bot.get_redirect(slug.lower())
		if exists or redirexists:
			return await ctx.error('This slug is already in use!')
		redir = await self.createredirect(slug.lower(), url, ctx.author.id)
		if redir:
			author = str(ctx.author).replace('#', '%23')
			if not self.bot.dev:
				# setup slack
				await pushover(f'{author} ({ctx.author.id}) has created the redirect `{slug}` for {url}', url=url, url_title='Check out redirect')
			else:
				await pushover(f'{author} ({ctx.author.id}) has created the redirect `{slug}` for {url}', url=url, url_title='Check out redirect')
			return await ctx.success(f'Your redirect is https://inv.wtf/{slug.lower()}')
		else:
			return await ctx.error('Something went wrong...')

	@commands.group(name='tags', aliases=['tag', 'dtag'], invoke_without_command=True)
	@commands.guild_only()
	async def tags(self, ctx, *, tagname: str = None):
		if not ctx.invoked_subcommand:
			taglist = self.tags[ctx.guild.id] if ctx.guild.id in self.tags else False
			if not taglist:
				return await ctx.error('No tags found.')
			if not tagname:
				taglist = ', '.join(taglist)
				embed = discord.Embed(title=f'{ctx.guild.name}\'s tags', color=ctx.author.color, description=taglist)
				return await ctx.send(embed=embed)
			else:
				tag = taglist[tagname.lower()] if tagname.lower() in taglist else False
				if not tag:
					return await ctx.error(f'No tag called {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))} found.')
				else:
					if ctx.invoked_with == 'dtag':
						await ctx.message.delete()
					await ctx.send(content=discord.utils.escape_mentions(tag))

	@tags.command(name='raw')
	async def tagraw(self, ctx, *, tagname: str = None):
		taglist = self.tags[ctx.guild.id] if ctx.guild.id in self.tags else False
		if not taglist:
			return await ctx.error('No tags found.')
		if not tagname:
			return await ctx.error(f'No tag provided. Use {ctx.prefix}tags to view all tags')
		else:
			tag = taglist[tagname.lower()] if tagname.lower() in taglist else False
			if not tag:
				return await ctx.error(f'No tag called {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))} found.')
			else:
				await ctx.send(content=discord.utils.escape_markdown(discord.utils.escape_mentions(tag)))

	@commands.has_permissions(manage_messages=True)
	@tags.command(name='create', aliases=['new', 'add'])
	async def tagcreate(self, ctx, tagname: str, *, tagcontent: str):
		currenttags = self.tags[ctx.guild.id] if ctx.guild.id in self.tags else []
		existing = currenttags[tagname] if tagname in currenttags else False
		if existing:
			return await ctx.error(f'A tag with the name {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))} already exists')
		if len(currenttags) >= 20:
			premiumguilds = self.bot.premiumGuilds
			if ctx.guild.id not in premiumguilds:
				return await ctx.error(f'You\'ve reached the tag limit! Upgrade to premium for unlimited tags;\n<https://inv.wtf/premium>')
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'INSERT INTO tags (\"gid\", \"name\", \"content\") VALUES ($1, $2, $3);'
			await self.bot.db.execute(query, ctx.guild.id, tagname.lower(), tagcontent)
		await self.bot.db.release(con)
		await self.loadtags()
		return await ctx.success(f'Successfully created the tag {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))}')

	@commands.has_permissions(manage_messages=True)
	@tags.command(name='delete', aliases=['del', 'remove'])
	async def tagdelete(self, ctx, tagname: str):
		currenttags = self.tags[ctx.guild.id] if ctx.guild.id in self.tags else []
		existing = currenttags[tagname.lower()] if tagname.lower() in currenttags else False
		if not existing:
			return await ctx.error(f'A tag with the name {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))} doesn\'t exist')
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM tags WHERE name = $1 AND gid = $2'
			await self.bot.db.execute(query, tagname.lower(), ctx.guild.id)
		await self.bot.db.release(con)
		await self.loadtags()
		return await ctx.success(f'Successfully deleted the tag {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))}')

	@commands.command(description='Fetch a channel and get some beautiful json')
	async def fetchchannel(self, ctx, channel: typing.Union[TextChannel, VoiceChannel, Category] = None):
		if channel is None:
			channel = ctx.channel

		route = discord.http.Route("GET", f"/channels/{channel.id}")
		try:
			raw = await ctx.bot.http.request(route)
		except discord.HTTPException:
			raise commands.UserInputError('Couldn\'t find that channel.')
			return

		try:
			cjson = json.dumps(raw, indent=2).replace('`', '\`')
			await ctx.send("```json\n{}```".format(cjson))
		except discord.HTTPException as e:
			e = str(e)
			if 'Must be 2000 or fewer in length' in e:
				paginator = WrappedPaginator(prefix='```json', suffix='```', max_size=1895)
				paginator.add_line(json.dumps(raw, indent=2).replace('`', '\`'))
				interface = PaginatorInterface(ctx.bot, paginator, owner=ctx.author)
				await interface.send_to(ctx)

	@commands.command(name='fetchactivity', description='Get a member\'s activity in json')
	async def fetchactivity(self, ctx, member: Member = None):
		"""PFXfetchactivity [<member>]"""
		if not member:
			member = ctx.author
		try:
			a = member.activities
			activities = []
			for act in a:
				activities.append(act.to_dict())
			ajson = json.dumps(activities, indent=2).replace('`', '\`')
			await ctx.send('```json\n{}```'.format(ajson)) #i dont want to use format() but im forced to
		except Exception:
			return await ctx.send('I couldn\'t get that member\'s activity...')

	def gtts(self, text: str):
		fp = strgen.StringGenerator("[\d\w]{20}").render()
		tts = gTTS(text)
		tts.save(f'{fp}.mp3')
		return fp
	
	@commands.command(description='Make Google TTS say something!')
	async def tts(self, ctx, *, text: str):
		fp = await self.bot.loop.run_in_executor(None, functools.partial(self.gtts, text))
		ttsfile = discord.File(f'{fp}.mp3', f'{ctx.author}.mp3')
		await ctx.send(file=ttsfile)
		os.remove(f'{fp}.mp3')
		
def setup(bot):
	bot.add_cog(utils(bot))
	bot.logger.info(f'$GREENLoaded Utilities cog!')
