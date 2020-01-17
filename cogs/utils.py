
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

print('utils.py has been loaded')

with open('config.json', 'r') as cfg:
	config = json.load(cfg)
	error_string = '<a:fireFailed:603214400748257302>'
	success_string = '<a:fireSuccess:603214443442077708>'

def isadmin(ctx):
	'''Checks if the author is an admin'''
	if str(ctx.author.id) not in config['admins']:
		admin = False
	else:
		admin = True
	return admin

snipes = {}
esnipes = {}
disabled = [264445053596991498, 110373943822540800, 336642139381301249, 458341246453415947]

def snipe_embed(context_channel, message, user, edited = False):
	if not message.system_content and message.embeds and message.author.bot:
		sembed = message.embeds[0]
		return sembed
	if message.author not in message.guild.members or message.author.color == discord.Colour.default():
		lines = []
		msg = message.system_content.split('\n')
		for line in msg:
			lines.append(f'> {line}')
		embed = discord.Embed(description='\n'.join(lines), timestamp=message.created_at)
	else:
		lines = []
		msg = message.system_content.split('\n')
		for line in msg:
			lines.append(f'> {line}')
		embed = discord.Embed(description='\n'.join(lines), color=message.author.color, timestamp=message.created_at)
	embed.set_author(name=str(message.author), icon_url=str(message.author.avatar_url_as(static_format='png', size=2048)))
	if message.attachments and not edited:
		embed.add_field(name='Attachment(s)', value='\n'.join([attachment.filename for attachment in message.attachments]) + '\n\n__Attachment URLs are invalidated once the message is deleted.__')
	if message.channel != context_channel:
		embed.set_footer(text='Sniped by: ' + str(user) + ' | in channel: #' + message.channel.name)
	else:
		embed.set_footer(text='Sniped by: ' + str(user))
	return embed

def quote_embed(context_channel, message, user):
	if not message.system_content and message.embeds and message.author.bot:
		embed = message.embeds[0]
	else:
		if message.author not in message.guild.members or message.author.color == discord.Colour.default():
			lines = []
			embed = discord.Embed(timestamp=message.created_at)
			if message.system_content:
				msg = message.system_content.split('\n')
				for line in msg:
					lines.append(f'> {line}')
				embed.add_field(name='Message', value='\n'.join(lines) or 'null', inline=False)
			embed.add_field(name='Jump URL', value=f'[Click Here]({message.jump_url})', inline=False)
		else:
			embed = discord.Embed(color=message.author.color, timestamp=message.created_at)
			lines = []
			if message.system_content:
				msg = message.system_content.split('\n')
				for line in msg:
					lines.append(f'> {line}')
				embed.add_field(name='Message', value='\n'.join(lines) or 'null', inline=False)
			embed.add_field(name='Jump URL', value=f'[Click Here]({message.jump_url})', inline=False)
		if message.attachments:
			if message.channel.is_nsfw() and not context_channel.is_nsfw():
				embed.add_field(name='Attachments', value=':underage: Quoted message is from an NSFW channel.')
			elif len(message.attachments) == 1 and message.attachments[0].url.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.gifv', '.webp', '.bmp')):
				embed.set_image(url=message.attachments[0].url)
			else:
				for attachment in message.attachments:
					embed.add_field(name='Attachment', value='[' + attachment.filename + '](' + attachment.url + ')', inline=False)
		embed.set_author(name=str(message.author), icon_url=str(message.author.avatar_url_as(static_format='png', size=2048)), url='https://discordapp.com/channels/' + str(message.guild.id) + '/' + str(message.channel.id) + '/' + str(message.id))
		if message.channel != context_channel:
			if message.channel.guild != context_channel.guild:
				embed.set_footer(text=f'Quoted by: {user} | #{message.channel} | {message.channel.guild}')
			else:
				embed.set_footer(text=f'Quoted by: {user} | #{message.channel}')
		else:
			embed.set_footer(text=f'Quoted by: {user}')
	return embed

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

dehoistchars = 'abcdefghijklmnopqrstuvwxyz'

day_regex = re.compile(r'(?:(?P<days>\d+)(?:d|days|day| days| day))')
hour_regex = re.compile(r'(?:(?P<hours>\d+)(?:h|hours|hour| hours| hour))')
min_regex = re.compile(r'(?:(?P<minutes>\d+)(?:m|minutes|minute| minutes| minute))')
sec_regex = re.compile(r'(?:(?P<seconds>\d+)(?:s|seconds|second| seconds| second))')

def parseTime(content, replace: bool = False):
	if replace:
		for regex in [r'(?:(?P<days>\d+)(?:d|days|day| days| day))', r'(?:(?P<hours>\d+)(?:h|hours|hour| hours| hour))', r'(?:(?P<minutes>\d+)(?:m|minutes|minute| minutes| minute))', r'(?:(?P<seconds>\d+)(?:s|seconds|second| seconds| second))']:
			content = re.sub(regex, '', content, 0, re.MULTILINE)
		return content
	try:
		days = day_regex.search(content)
		hours = hour_regex.search(content)
		minutes = min_regex.search(content)
		seconds = sec_regex.search(content)
	except Exception:
		return 0, 0, 0, 0
	time = 0
	if days or hours or minutes or seconds:
		days = days.group(1) if days != None else 0
		hours = hours.group(1) if hours != None else 0
		minutes = minutes.group(1) if minutes != None else 0
		seconds = seconds.group(1) if seconds != None else 0
		days = int(days) if days else 0
		if not days:
			days = 0
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
		self.channelfollowable = []
		self.channelfollows = {}
		self.bot.vanity_urls = {}
		self.bot.redirects = {}
		self.bot.descriptions = {}
		if 'slack_messages' not in dir(self.bot):
 			self.bot.slack_messages = {}
		self.bot.getvanity = self.getvanity
		self.bot.getredirect = self.getredirect
		self.bot.getvanitygid = self.getvanitygid
		self.bot.vanityclick = self.vanityclick
		self.bot.vanitylink = self.vanitylink
		self.tags = {}
		self.reminders = {}
		self.remindcheck.start()
		self.quotecooldowns = {}

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

	def getvanity(self, code: str):
		if code.lower() in self.bot.vanity_urls:
			return self.bot.vanity_urls[code.lower()]
		else:
			return False

	def getredirect(self, code: str):
		if code.lower() in self.bot.redirects:
			return self.bot.redirects[code.lower()]
		else:
			return False

	def getvanitygid(self, gid: int):
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

	async def loadfollowable(self):
		self.channelfollowable = []
		query = 'SELECT * FROM followable;'
		follows = await self.bot.db.fetch(query)
		for c in follows:
			self.channelfollowable.append(int(c['cid']))

	async def loadfollows(self):
		self.channelfollows = {}
		query = 'SELECT * FROM channelfollow;'
		follows = await self.bot.db.fetch(query)
		for f in follows:
			chanurl = f['following']
			if chanurl.startswith('https://canary.discordapp.com/channels/'):
				ids = chanurl.strip('https://canary.discordapp.com/channels/')
			elif chanurl.startswith('https://ptb.discordapp.com/channels/'):
				ids = chanurl.strip('https://ptb.discordapp.com/channels/')
			elif chanurl.startswith('https://discordapp.com/channels/'):
				ids = chanurl.strip('https://discordapp.com/channels/')
			id_list = ids.split('/')
			if len(id_list) != 2:
				pass
			else:
				fcid = int(id_list[1])
				fgid = int(id_list[0])
				try:
					self.channelfollows[fcid].append({
						'fcid': int(fcid),
						'fgid': int(fgid),
						'gid': int(f['gid']),
						'cid': int(f['cid'])
					})
				except KeyError:
					self.channelfollows[fcid] = []
					self.channelfollows[fcid].append({
						'fcid': int(fcid),
						'fgid': int(fgid),
						'gid': int(f['gid']),
						'cid': int(f['cid'])
					})


	async def loadvanitys(self):
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
					'url': f'https://oh-my-god.wtf/{code}',
					'inviteurl': f'https://discord.gg/{invite}'
				}
		api = self.bot.get_cog('Fire API')
		if api:
			self.bot.loop.create_task(api.loadredirembed(self.bot.redirects))

	async def loadtags(self):
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

	async def loaddescs(self):
		self.bot.descriptions = {}
		query = 'SELECT * FROM descriptions;'
		descs = await self.bot.db.fetch(query)
		for d in descs:
			self.bot.descriptions[d['gid']] = d['desc']

	async def loadremind(self):
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
								if len(list_ids) == 3 and urlbranch != None:
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
											print('\n'.join(traceback.format_exception(type(e), e, e.__traceback__)))
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
							print(f'Tried to send reminder to {tosend} but an exception occured (and no, it wasn\'t forbidden)')
							print('\n'.join(traceback.format_exception(type(e), e, e.__traceback__)))
		except Exception as e:
			print('\n'.join(traceback.format_exception(type(e), e, e.__traceback__)))

	@commands.Cog.listener()
	async def on_ready(self):
		await asyncio.sleep(5)
		await self.loadvanitys()
		await self.loadtags()
		await self.loaddescs()
		await self.loadremind()
		print('Utilities loaded!')

	@commands.command(name='errortest', hidden=True)
	async def errortestboyo(self, ctx):
		if await self.bot.is_team_owner(ctx.author):
			raise commands.CommandError('https://someurl.wtf/api?key=API_KEY')

	@commands.command(name='plonk', description='Add someone to the blacklist', hidden=True)
	async def blacklist_add(self, ctx, user: UserWithFallback = None, reason: str = 'bad boi', permanent: bool = False):
		'''PFXbl.add <user> [<reason>] <perm: true/false>'''
		if not isadmin(ctx):
			return
		if user == None:
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
				await ctx.send(f'Blacklist entry updated for {user.mention}.')
			self.bot.plonked = await self.bot.get_cog("Miscellaneous").loadplonked()

	@commands.command(name='unplonk', description='Remove someone from the blacklist', hidden=True)
	async def blacklist_remove(self, ctx, user: UserWithFallback = None):
		'''PFXbl.remove <user>'''
		if not isadmin(ctx):
			return
		if user == None:
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
			self.bot.plonked = await self.bot.get_cog("Miscellaneous").loadplonked()

	featureslist = {
		'PARTNERED': '[Partnered](https://dis.gd/partners)',
		'VERIFIED': '[Verified](https://dis.gd/verified)',
		'COMMERCE': '[Store Channels](https://dis.gd/sell-your-game)',
		'NEWS': '[Announcement Channels](https://support.discordapp.com/hc/en-us/articles/360032008192)',
		'FEATUREABLE': '[Featurable](https://discordapp.com/activity)',
		'DISCOVERABLE': '[Discoverable](https://discordapp.com/guild-discovery) [(Discoverable Guidelines)](https://support.discordapp.com/hc/en-us/articles/360035969312)',
		'PUBLIC': '[Public](https://bit.ly/2kV6ogn)',
		'VANITY_URL': 'Vanity URL',
		'ANIMATED_ICON': 'Animated Icon',
		'BANNER': 'Banner',
		'INVITE_SPLASH': 'Invite Splash',
		'MORE_EMOJI': 'More Emoji',
		'VIP_REGIONS': 'VIP Regions',
		# CUSTOM FEATURES
		'PREMIUM': '<:firelogo:665339492072292363> [Premium](https://gaminggeek.dev/patreon)'
	}

	@commands.group(name='info', invoke_without_command=True)
	@commands.guild_only()
	async def infogroup(self, ctx):
		'''PFXinfo'''
		embed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
		embed.set_author(name=ctx.guild.name, icon_url=str(ctx.guild.icon_url))
		embed.add_field(name='Info Commands', value=f'> {ctx.prefix}info guild | Get\'s info about the guild\n> {ctx.prefix}info user [<user>] | Get\'s info about you or another user\n> {ctx.prefix}info role [<role>] | Get\'s info about your top role or another role', inline=False)
		await ctx.send(embed=embed)

	@infogroup.command(description='Check out the guild\'s info', aliases=['server'])
	async def guild(self, ctx):
		'''PFXinfo guild'''
		guild = ctx.guild
		embed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
		embed.set_thumbnail(url=guild.icon_url)
		nameemote = ''
		if 'PARTNERED' in guild.features:
			nameemote = discord.utils.get(self.bot.emojis, id=647400542775279629)
		if 'VERIFIED' in guild.features:
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
		embed.add_field(name="» Created", value=str(guild.created_at).split('.')[0], inline=True)
		features = ', '.join([self.featureslist[f] for f in guild.features if f in self.featureslist])
		if features and features != '':
			embed.add_field(name="» Features", value=features, inline=False)
		roles = []
		for role in guild.roles:
			if role.managed:
				pass
			elif 'ACK' in role.name and guild.id == 564052798044504084:
				pass
			elif role.is_default():
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
			await ctx.send(embed=rolebed)

	@infogroup.command(description='Check out a user\'s info')
	async def user(self, ctx, *, user: typing.Union[Member, UserWithFallback] = None):
		'''PFXinfo user [<user>]'''
		if not user:
			user = ctx.author
		if type(user) == discord.ClientUser:
			user = ctx.guild.me
		if type(user) == discord.User:
			color = ctx.author.color
		elif type(user) == discord.Member:
			color = user.color
		if ctx.guild.get_member(user.id):
			user = ctx.guild.get_member(user.id)
		badge = ''
		for guild in self.bot.guilds:
			if guild.owner_id == user.id and 'PARTNERED' in guild.features:
				badge = discord.utils.get(self.bot.emojis, name='PartnerShine')
		embed = discord.Embed(title=f'{user} ({user.id})', colour=color, timestamp=datetime.datetime.utcnow())
		embed.set_thumbnail(url=str(user.avatar_url_as(static_format='png', size=2048)))
		if type(user) == discord.Member:
			members = sorted(ctx.guild.members, key=lambda m: m.joined_at or m.created_at)
			embed.add_field(name="» Join Position", value=members.index(user) + 1, inline=False)
		embed.add_field(name="» Created", value=humanfriendly.format_timespan(datetime.datetime.utcnow() - user.created_at, max_units=2) + ' ago', inline=False)
		if type(user) == discord.Member:
			if user.nick:
				embed.add_field(name="» Nickname", value=user.nick, inline=False)
			if user.premium_since:
				embed.add_field(name="» Boosting Since", value=str(user.premium_since).split('.')[0], inline=False)
			roles = []
			for role in user.roles:
				if role.is_default():
					pass
				else:
					roles.append(role.mention)
			embed.add_field(name="» Roles", value=' - '.join(roles) or 'No roles', inline=False)
		if not user.bot:
			trust = 'High' # yes ravy I'm stealing your trust thing. go check out ravy, https://ravy.xyz/
			current = await ctx.guild.bans()
			if len([b for b in current if b.user.id == user.id]) >= 1:
				trust = 'Moderate'
				lban = f'<a:fireWarning:660148304486727730> Banned in {ctx.guild.name}'
			else:
				lban = f'<a:fireSuccess:603214443442077708> Not banned in {ctx.guild.name}'
			ksoftban = await self.bot.ksoft.bans_check(user.id)
			if ksoftban:
				trust = 'Low'
				ksoftban = await self.bot.ksoft.bans_info(user.id)
				gban = f'<a:fireFailed:603214400748257302> Banned on KSoft.Si for {ksoftban.reason} - [Proof]({ksoftban.proof})'
			else:
				gban = '<a:fireSuccess:603214443442077708> Not banned on KSoft.Si'
			if hasattr(self.bot, 'chatwatch') and self.bot.chatwatch.connected:
				cwbl = ''
				cwprofile = await self.bot.chatwatch.profile(user.id)
				if cwprofile['score'] > 50:
					if trust != 'Low':
						trust = 'Moderate'
					cwbl = f'<a:fireWarning:660148304486727730> Chatwatch score of **{cwprofile["score"]}%**'
				if cwprofile['score'] > 80:
					trust = 'Low'
					cwbl = f'<a:fireFailed:603214400748257302> Chatwatch score of **{cwprofile["score"]}%**'
				if cwprofile['score'] == 50:
					cwbl = '<:neutral:667128324107272192> Chatwatch score of **50%**'
				if cwprofile['whitelisted']:
					 cwbl = f'<a:fireSuccess:603214443442077708> **Whitelisted** on Chatwatch'
				elif cwprofile['blacklisted_reason'] and cwprofile['blacklisted']:
					trust = 'Low'
					cwbl = f'<a:fireFailed:603214400748257302> Blacklisted on Chatwatch for **{cwprofile["blacklisted_reason"]}**'
				if not cwbl:
					cwbl = f'<a:fireSuccess:603214443442077708> Chatwatch score of **{cwprofile["score"]}%**'
				elif cwprofile['blacklisted_reason'] and cwprofile['score'] > 80 and not cwprofile['blacklisted']:
					cwbl = cwbl + f' and was previously blacklisted for **{cwprofile["blacklisted_reason"]}**'
			elif not hasattr(self.bot, 'chatwatch') or not self.bot.chatwatch.connected:
				cwbl = '<:neutral:667128324107272192>  Not connected to chatwatch'	
			embed.add_field(name=f'Trust - {trust}', value='\n'.join([lban, gban, cwbl]), inline=False)
		ack = self.bot.acknowledgements.get(user.id, []) if hasattr(self.bot, 'acknowledgements') else []
		if ack:
			embed.add_field(name='» Recognized User', value=', '.join(ack))
		await ctx.send(embed=embed)

	@infogroup.command(description='Check out a role\'s info')
	async def role(self, ctx, *, role: Role = None):
		'''PFXinfo role [<role>]'''
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
			'minor': discord.Color.orange(),
			'major': discord.Color.red()
		}
		summary = await aiohttp.ClientSession().get('https://status.discordapp.com/api/v2/summary.json')
		summary = await summary.json()
		incidents = await aiohttp.ClientSession().get('https://status.discordapp.com/api/v2/incidents.json')
		incidents = await incidents.json()
		desc = []
		for c in summary['components']:
			if c['group_id']:
				continue
			if c['status'] == 'operational':
				desc.append(f'<a:fireSuccess:603214443442077708> **{c["name"]}**: {c["status"].replace("_", " ").title()}')
			else:
				desc.append(f'<a:fireFailed:603214400748257302> **{c["name"]}**: {c["status"].replace("_", " ").title()}')
		embed = discord.Embed(color=colors[str(summary['status']['indicator'])], timestamp=datetime.datetime.utcnow(), description='\n'.join(desc))
		incident = incidents['incidents'][0]
		embed.add_field(name='Latest Incident', value=f'[{incident["name"]}]({incident["shortlink"]})\nStatus: **{incident["status"].capitalize()}**')
		await ctx.send(embed=embed)

	@commands.command(description='Bulk delete messages')
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
			await channel.purge(limit=amount, check=purgecheck)
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
			await ctx.channel.purge(limit=amount)
		await channel.send(f'Successfully deleted **{len(self.bot.recentpurge[ctx.channel.id])}** messages!', delete_after=5)

	@commands.command(name='followable', description='Make the current channel followable.')
	async def followable(self, ctx, canfollow: bool = False):
		if not await self.bot.is_team_owner(ctx.author):
			return
		if canfollow and ctx.channel.id not in self.channelfollowable:
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO followable (\"cid\") VALUES ($1);'
				await self.bot.db.execute(query, ctx.channel.id)
			await self.bot.db.release(con)
			await self.loadfollowable()
			return await ctx.success('This channel can now be followed!')
		else:
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'DELETE FROM followable WHERE cid = $1;'
				await self.bot.db.execute(query, ctx.channel.id)
			await self.bot.db.release(con)
			await self.loadfollowable()
			return await ctx.success('This channel is no longer followable')

	@commands.command(name='follow', description='Follow a channel and recieve messages from it in your own server', aliases=['cfollow', 'channelfollow'], hidden=True)
	async def follow(self, ctx, follow: typing.Union[TextChannel, str]):
		'''PFXfollow <channel|link>'''
		if not await self.bot.is_team_owner(ctx.author):
			return
		if isinstance(follow, discord.TextChannel):
			if follow.id in self.channelfollowable:
				return await ctx.send(f'Use this command in the channel you want to recieve messages from {follow.mention} in;\n`fire follow https://discordapp.com/channels/{ctx.guild.id}/{follow.id}`')
			else:
				return await ctx.error('This channel has not been made followable!')
		elif isinstance(follow, str):
			if 'https://discordapp.com/channels' not in follow:
				getchan = discord.utils.get(ctx.guild.channels, name=follow)
				if not getchan:
					return await ctx.error('Invalid argument! Please provide a channel or a link to follow')
				if isinstance(getchan, discord.TextChannel):
					follow = getchan
					if follow.id in self.channelfollowable:
						return await ctx.send(f'Use this command in the channel you want to recieve messages from {follow.mention} in;\n`fire follow https://discordapp.com/channels/{ctx.guild.id}/{follow.id}`')
					else:
						return await ctx.error('This channel has not been made followable!')
				elif isinstance(getchan, discord.VoiceChannel) or isinstance(getchan, discord.CategoryChannel):
					return await ctx.error('Invalid argument! Please provide a **text** channel or a link to follow')
			chanurl = follow.lower().strip('<>')
			if chanurl.startswith('https://canary.discordapp.com/channels/'):
				ids = chanurl.strip('https://canary.discordapp.com/channels/')
			elif chanurl.startswith('https://ptb.discordapp.com/channels/'):
				ids = chanurl.strip('https://ptb.discordapp.com/channels/')
			elif chanurl.startswith('https://discordapp.com/channels/'):
				ids = chanurl.strip('https://discordapp.com/channels/')
			id_list = ids.split('/')
			if len(id_list) != 2:
				return await ctx.error(f'Invalid argument! Make sure the link follows this format; https://discordapp.com/channels/{ctx.guild.id}/{ctx.channel.id}')
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO channelfollow (\"following\", \"gid\", \"cid\") VALUES ($1, $2, $3);'
				try:
					await self.bot.db.execute(query, chanurl, ctx.guild.id, ctx.channel.id)
				except asyncpg.exceptions.UniqueViolationError:
					try:
						return await ctx.error(f'Already following a channel here!')
					except Exception:
						return
			await self.bot.db.release(con)
			await self.loadfollows()
			return await ctx.success(f'Now following <#{id_list[-1]}>')

	@commands.command(name='unfollow', description='Unfollow the channel that has been followed', hidden=True)
	async def unfollow(self, ctx):
		if not await self.bot.is_team_owner(ctx.author):
			return
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM channelfollow WHERE cid = $1;'
			await self.bot.db.execute(query, ctx.channel.id)
		await self.bot.db.release(con)
		await self.loadfollows()
		return await ctx.success(f'Successfully unfollowed all followed channels')

	@commands.Cog.listener()
	async def on_guild_remove(self, guild):
		try:
			del snipes[guild.id]
		except KeyError:
			pass

	@commands.Cog.listener()
	async def on_guild_channel_delete(self, channel):
		try:
			del snipes[channel.guild.id][channel.id]
		except KeyError:
			pass

	@commands.Cog.listener()
	async def on_message_delete(self, message):
		if isinstance(message.channel, discord.DMChannel):
			return
		try:
			snipes[message.guild.id][message.author.id] = message
		except KeyError:
			snipes[message.guild.id] = {message.author.id: message}
		if message.guild and not message.author.bot:
			try:
				snipes[message.guild.id][message.channel.id] = message
			except KeyError:
				snipes[message.guild.id] = {message.channel.id: message}

	@commands.Cog.listener()
	async def on_message_edit(self, before, after):
		if isinstance(after.channel, discord.DMChannel):
			return
		if before.guild and not before.author.bot:
			try:
				esnipes[before.guild.id][before.channel.id] = before
			except KeyError:
				esnipes[before.guild.id] = {before.channel.id: before}
			try:
				esnipes[before.guild.id][before.author.id] = before
			except KeyError:
				esnipes[before.guild.id] = {before.author.id: before}

	@commands.command(description='Get the last deleted message')
	async def snipe(self, ctx, source: typing.Union[TextChannel, Member, int] = None):
		'''PFXsnipe [<channel|user>]'''
		if type(source) == int:
			source = self.bot.get_channel(source)
		if type(source) == discord.Member:
			if source.guild != ctx.guild:
				raise commands.ArgumentParsingError('Unable to find Member')
		if not source:
			source = ctx.channel

		if type(source) == discord.TextChannel:
			if not ctx.author.permissions_in(source).read_messages:
				return

		try:
			sniped_message = snipes[ctx.guild.id][source.id]
		except KeyError:
			return await ctx.send(content = '<a:fireFailed:603214400748257302> **No available messages.**')
		else:
			await ctx.send(embed = snipe_embed(ctx.channel, sniped_message, ctx.author))

	@commands.command(description='Get the last edited message')
	async def esnipe(self, ctx, source: typing.Union[TextChannel, Member, int] = None):
		'''PFXesnipe [<channel|user>]'''
		if type(source) == int:
			source = self.bot.get_channel(source)
		if type(source) == discord.Member:
			if source.guild != ctx.guild:
				raise commands.ArgumentParsingError('Unable to find Member')
		if not source:
			source = ctx.channel

		if type(source) == discord.TextChannel:
			if not ctx.author.permissions_in(source).read_messages:
				return

		try:
			sniped_message = esnipes[ctx.guild.id][source.id]
		except KeyError:
			return await ctx.send(content = '<a:fireFailed:603214400748257302> **No available messages.**')
		else:
			await ctx.send(embed = snipe_embed(ctx.channel, sniped_message, ctx.author, True))

	@commands.Cog.listener()
	async def on_raw_reaction_add(self, payload):
		if str(payload.emoji) == '💬' and not self.bot.get_guild(payload.guild_id).get_member(payload.user_id).bot:
			guild = self.bot.get_guild(payload.guild_id)
			channel = guild.get_channel(payload.channel_id)
			user = guild.get_member(payload.user_id)

			if guild.id in disabled:
				return

			if user.permissions_in(channel).send_messages:
				try:
					message = await channel.fetch_message(payload.message_id)
				except discord.NotFound:
					return
				except discord.Forbidden:
					return
				else:
					if not message.system_content and message.embeds and message.author.bot:
						try:
							await channel.send(content = 'Raw embed from `' + str(message.author).strip('`') + '` in ' + message.channel.mention, embed = quote_embed(channel, message, user))
						except discord.Forbidden:
							return
					else:
						try:
							await channel.send(embed = quote_embed(channel, message, user))
						except discord.Forbidden:
							return

	@commands.Cog.listener()
	async def on_message(self, message):
		if '--remind' in message.content.lower():
			content = message.content.lower().replace(' --remind', '').replace('--remind ', '').replace('--remind', '') # Make sure --remind is replaced with space before, after, both or none
			ctx = await self.bot.get_context(message)
			alt_ctx = await copy_context_with(ctx, content=self.bot.prefixes[message.guild.id] + f'remind {content}')
			if not alt_ctx.valid:
				return
			return await alt_ctx.command.reinvoke(alt_ctx)
		if all(ae in message.content.lower() for ae in ['qr code', 'discord', 'exploit']) and message.guild.id in [564052798044504084, 411619823445999637, 525056817399726102] and not message.author.bot:
			await message.delete()
			ctx = await self.bot.get_context(message)
			gek = message.guild.get_member(287698408855044097)
			alt_ctx = await copy_context_with(ctx, author=gek, content='fire tag qr')
			if not alt_ctx.valid:
				return
			return await alt_ctx.command.reinvoke(alt_ctx)
		if message.channel.id in self.channelfollows and message.channel.id in self.channelfollowable and not message.author.bot:
			def pub_check(msg):
				if msg.system_content.lower() == 'yes' and msg.author.id == message.author.id:
					return True
				else:
					return False
			try:
				if message.system_content.lower() == 'yes' or ' followable' in message.system_content.lower():
					pass
				else:
					qmsg = await message.channel.send('There are users following this channel. Would you like to publish this message? (Say `yes` to publish)')
					yee = await self.bot.wait_for('message', timeout=30.0, check=pub_check)
					if yee:
						following = self.channelfollows[message.channel.id]
						for follow in following:
							g = self.bot.get_guild(follow['gid'])
							c = g.get_channel(follow['cid'])
							if message.embeds:
								for embed in message.embeds:
									await c.send(f'**Embed from #{message.channel.name}**:**')
									await c.send(embed=embed)
							if message.system_content:
								await c.send(f'**Messsage from #{message.channel.name}:**')
								await c.send(message.system_content)
						await qmsg.delete()
						await yee.delete()
						return await message.channel.send('<a:fireSuccess:603214443442077708> Successfully sent your message to all followers!', delete_after=5)
			except asyncio.TimeoutError:
				try:
					await qmsg.delete()
				except Exception:
					pass
			except Exception:
				pass
		if 'fetchmsg' in message.content.lower():
			return
		if 'quote' in message.content.lower():
			return
		if 'remind' in message.content.lower():
			return
		if message.guild != None:
			if message.guild.id in disabled:
				return
			perms = message.guild.me.permissions_in(message.channel)
			if not perms.send_messages or not perms.embed_links or message.author.bot:
				return

			cooldowns = self.quotecooldowns[message.guild.id] if message.guild.id in self.quotecooldowns else []
			if not cooldowns:
				self.quotecooldowns[message.guild.id] = []
			elif message.author.id in cooldowns and not message.author.permissions_in(message.channel).manage_messages:
				return

			for i in message.content.split():
				word = i.lower().strip('<>')
				if word.startswith('https://canary.discordapp.com/channels/'):
					word = word.strip('https://canary.discordapp.com/channels/')
				elif word.startswith('https://ptb.discordapp.com/channels/'):
					word = word.strip('https://ptb.discordapp.com/channels/')
				elif word.startswith('https://discordapp.com/channels/'):
					word = word.strip('https://discordapp.com/channels/')
				else:
					continue

				list_ids = word.split('/')
				if len(list_ids) == 3:
					del list_ids[0]

					try:
						channel = self.bot.get_channel(int(list_ids[0]))
					except:
						pass

					if not channel:
						return

					user = channel.guild.get_member(message.author.id)
					uperms = user.permissions_in(channel)
					if not uperms.read_messages:
						return

					if channel and isinstance(channel, discord.TextChannel):
						try:
							msg_id = int(list_ids[1])
						except:
							continue

						try:
							msg_found = await channel.fetch_message(msg_id)
						except:
							continue
						else:
							if not msg_found.content and msg_found.embeds and msg_found.author.bot:
								await message.channel.send(content = 'Raw embed from `' + str(msg_found.author).strip('`') + '` in ' + msg_found.channel.mention, embed = quote_embed(message.channel, msg_found, message.author))
								try:
									self.quotecooldowns[message.guild.id].append(message.author.id)
									await asyncio.sleep(20)
									self.quotecooldowns[message.guild.id].remove(message.author.id)
								except KeyError:
									self.quotecooldowns[message.guild.id] = []
									self.quotecooldowns[message.guild.id].append(message.author.id)
									await asyncio.sleep(20)
									self.quotecooldowns[message.guild.id].remove(message.author.id)
							else:
								try:
									await message.channel.send(embed=quote_embed(message.channel, msg_found, message.author))
								except discord.HTTPException as e:
									if 'Must be 1024 or fewer in length.' in str(e):
										return await message.channel.send('<a:fireFailed:603214400748257302> Failed to quote message, content too long')
								try:
									self.quotecooldowns[message.guild.id].append(message.author.id)
									await asyncio.sleep(20)
									self.quotecooldowns[message.guild.id].remove(message.author.id)
								except KeyError:
									self.quotecooldowns[message.guild.id] = []
									self.quotecooldowns[message.guild.id].append(message.author.id)
									await asyncio.sleep(20)
									self.quotecooldowns[message.guild.id].remove(message.author.id)

	@commands.command(description='Quote a message from an id or url')
	async def quote(self, ctx, msg: typing.Union[str, int] = None):
		'''PFXquote <message id|message url>'''
		if not msg:
			return await ctx.send(content = error_string + ' Please specify a message ID/URL to quote.')
		try:
			msg_id = int(msg)
		except Exception:
			msg_id = str(msg)
		if type(msg_id) == int:
			message = None
			try:
				message = await ctx.channel.fetch_message(msg_id)
			except:
				for channel in ctx.guild.text_channels:
					perms = ctx.guild.me.permissions_in(channel)
					if channel == ctx.channel or not perms.read_messages or not perms.read_message_history:
						continue

					try:
						message = await channel.fetch_message(msg_id)
					except:
						continue
					else:
						break

			if message:
				if not message.content and message.embeds and message.author.bot:
					await ctx.send(content = 'Raw embed from `' + str(message.author).strip('`') + '` in ' + message.channel.mention, embed = quote_embed(ctx.channel, message, ctx.author))
				else:
					await ctx.send(embed = quote_embed(ctx.channel, message, ctx.author))
			else:
				await ctx.send(content = error_string + ' I couldn\'t find that message...')
		else:
			perms =  ctx.guild.me.permissions_in( ctx.channel)
			if not perms.send_messages or not perms.embed_links or  ctx.author.bot:
				return

			for i in msg_id.split():
				word = i.lower().strip('<>')
				if word.startswith('https://canary.discordapp.com/channels/'):
					word = word.strip('https://canary.discordapp.com/channels/')
				elif word.startswith('https://ptb.discordapp.com/channels/'):
					word = word.strip('https://ptb.discordapp.com/channels/')
				elif word.startswith('https://discordapp.com/channels/'):
					word = word.strip('https://discordapp.com/channels/')
				else:
					continue

				list_ids = word.split('/')
				if len(list_ids) == 3:
					del list_ids[0]

					try:
						channel = self.bot.get_channel(int(list_ids[0]))
					except:
						continue

					if channel and isinstance(channel, discord.TextChannel):
						try:
							msg_id = int(list_ids[1])
						except:
							continue

						try:
							msg_found = await channel.fetch_message(msg_id)
						except:
							continue
						else:
							if not msg_found.content and msg_found.embeds and msg_found.author.bot:
								await ctx.send(content = 'Raw embed from `' + str(msg_found.author).replace('`', '\`') + '` in ' + msg_found.channel.mention, embed = quote_embed(ctx.channel, msg_found, ctx.author))
							else:
								await ctx.send(embed = quote_embed(ctx.channel, msg_found, ctx.author))

	@commands.command(description='Got a HTTP Error Code? My cat knows what it means.', name='http.cat')
	async def httpcat(self, ctx, error: int = 200):
		'''PFXhttp.cat <error code>'''
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
		'''PFXavatar [<user>]'''
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

	# @commands.command(description='Totally not a stolen idea from Dyno')
	# async def fireav(self, ctx, u: Member = None):
		# if not u:
		#	u = ctx.author
		# if isinstance(u, discord.Member):
		#	color = u.color
		# else:
		#	color = ctx.author.color
		# mask = Image.open('cogs/static/images/promotional-assets/fireavbase.png')
		# img = Image.open('cogs/static/images/promotional-assets/fireavbase.png')
		# av_bytes = await u.avatar_url_as(format='png', static_format='png', size=256).read()
		# av_img = Image.open(BytesIO(av_bytes))
		# sub_img = av_img.convert("RGBA")
		# try:
		#	img.paste(sub_img, (0, 0), mask)
		# except ValueError:
		#	return await ctx.send('I cannot make a Fire avatar with images smaller than 256x256')
		# buf = BytesIO()
		# img.save(buf, format='PNG')
		# buf.seek(0)
		# colorlogo = discord.File(buf, f'istolethisideafromdyno.png')
		# embed = discord.Embed(colour=ctx.author.color)
		# embed.set_image(url=f'attachment://istolethisideafromdyno.png')
		# await ctx.send(embed=embed, file=colorlogo)

	@commands.command(description='Make a role mentionable for 60 seconds or until you mention it')
	@commands.bot_has_permissions(manage_roles=True)
	@commands.has_permissions(manage_roles=True)
	async def tempmention(self, ctx, *, role: Role):
		'''PFXtempmention <role>'''
		await role.edit(mentionable=True)
		await ctx.send(f'Successfully made **{discord.utils.escape_mentions(discord.utils.escape_markdown(role.name))}** mentionable. It will stay mentionable until you mention it or 60 seconds go by', delete_after=5)
		def check(m):
			return m.author == ctx.author

		try:
			m = await self.bot.wait_for('message', timeout=60.0, check=check)
			await role.edit(mentionable=False)
		except asyncio.TimeoutError:
			await role.edit(mentionable=False)
			await ctx.send(f'**{discord.utils.escape_mentions(discord.utils.escape_markdown(role.name))}** is no longer mentionable. 60 seconds have passed')

	@commands.command(aliases=['desc'], description='Sets the guild\'s description')
	@commands.has_permissions(manage_guild=True)
	async def description(self, ctx, *, desc: str = None):
		if not desc:
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'DELETE FROM descriptions WHERE gid = $1;'
				await self.bot.db.execute(query, ctx.guild.id)
			await self.bot.db.release(con)
			await self.loaddescs()
			return await ctx.success('Reset guild description!')
		if ctx.guild.id not in self.bot.descriptions:
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO descriptions (\"gid\", \"desc\") VALUES ($1, $2);'
				await self.bot.db.execute(query, ctx.guild.id, desc)
			await self.bot.db.release(con)
		else:
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'UPDATE descriptions SET \"desc\"=$2 WHERE gid = $1;'
				await self.bot.db.execute(query, ctx.guild.id, desc)
			await self.bot.db.release(con)
		await self.loaddescs()
		return await ctx.success('Set guild description!')

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
		limit = datetime.datetime.utcnow() + datetime.timedelta(days=15)
		if forwhen > limit and not await self.bot.is_team_owner(ctx.author):
			return await ctx.error('Reminders currently cannot be set for more than 7 days')
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
		return await ctx.success('Reminder set!')

	@commands.command(description='Creates a vanity invite for your Discord using https://oh-my-god.wtf/')
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def vanityurl(self, ctx, code: str = None):
		'''PFXvanityurl [<code>|"disable"]'''
		premiumguilds = self.bot.get_cog('Premium Commands').premiumGuilds
		if not code and not ctx.guild.id in premiumguilds:
			return await ctx.error('You need to provide a code!')
		elif not code:
			current = self.bot.getvanitygid(ctx.guild.id)
			statuses = ['online', 'idle', 'dnd']
			online = len([m for m in ctx.guild.members if str(m.status) in statuses])
			gonline = f'⬤ {online:,d} Online'
			gmembers = f'⭘ {len(ctx.guild.members):,d} Members'
			desc = self.bot.descriptions[ctx.guild.id] if ctx.guild.id in self.bot.descriptions else f'Check out {ctx.guild} on Discord'
			desc = f'[{ctx.guild}]({current.get("url", "https://oh-my-god.wtf/")})\n{desc}\n\n{gonline} & {gmembers}'
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
					#please join my discord and boost so I can get an invite splash, https://oh-my-god.wtf/fire thank
				embed.set_image(url=str(image))
			embed.add_field(name='Clicks', value=current['clicks'])
			embed.add_field(name='Links', value=current['links'])
			embed.add_field(name='URL', value=current['url'].replace('oh-my-god', 'inv'), inline=False)
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
		exists = self.bot.getvanity(code.lower())
		redirexists = self.bot.getredirect(code.lower())
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
					print(e)
					if 'vanityapiurl' not in config:
						config['vanityurlapi'] = 'https://http.cat/404'
					await pushover(f'{author} ({ctx.author.id}) has created the Vanity URL `{vanity["url"]}` for {ctx.guild.name}', url=config['vanityurlapi'], url_title='Check current Vanity URLs')
			else:
				await pushover(f'{author} ({ctx.author.id}) has created the Vanity URL `{vanity["url"]}` for {ctx.guild.name}', url=config['vanityurlapi'], url_title='Check current Vanity URLs')
			return await ctx.success(f'Your Vanity URL is {vanity["url"]}')
		else:
			return await ctx.error('Something went wrong...')

	@commands.command(name='redirect', description='Creates a custom redirect for a URL using https://inv.wtf/')
	@commands.has_permissions(administrator=True)
	@commands.guild_only()
	async def makeredirect(self, ctx, slug: str = None, url: str = None, delete: bool = False):
		premiumguilds = self.bot.get_cog('Premium Commands').premiumGuilds
		if not ctx.guild.id in premiumguilds:
			return await ctx.error('This feature is premium only! You can learn more at <https://gaminggeek.dev/premium>')
		if not slug:
			return await ctx.error('You must provide a slug!')
		if not url:
			return await ctx.error('You must provide a url!')
		if url.lower() in ['delete', 'true', 'yeet']:
			delete = True
		if delete:
			current = self.getredirect(slug.lower())
			if current['uid'] != ctx.author.id:
				return await ctx.error('You can only delete your own redirects!')
			await self.deletevanitycode(slug.lower())
			return await ctx.success('Redirect deleted!')
		if 'https://' not in url:
			return await ctx.error('URL must include "https://"')
		if not re.fullmatch(r'[a-zA-Z0-9]+', slug):
			return await ctx.error('Redirect slugs can only contain characters A-Z0-9')
		if len(slug) < 3 or len(slug) > 20:
			return await ctx.error('The slug needs to be 3-20 characters!')
		exists = self.bot.getvanity(slug.lower())
		if exists and exists['gid'] not in premiumguilds:
			exists = False
		redirexists = self.bot.getredirect(slug.lower())
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

	@commands.has_permissions(manage_messages=True)
	@tags.command(name='create', aliases=['new', 'add'])
	async def tagcreate(self, ctx, tagname: str, *, tagcontent: str):
		'''PFXtag create <name> <tag content>'''
		currenttags = self.tags[ctx.guild.id] if ctx.guild.id in self.tags else []
		existing = currenttags[tagname] if tagname in currenttags else False
		if existing:
			return await ctx.error(f'A tag with the name {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))} already exists')
		if len(currenttags) >= 20:
			premiumguilds = self.bot.get_cog('Premium Commands').premiumGuilds
			if ctx.guild.id not in premiumguilds:
				return await ctx.error(f'You\'ve reached the tag limit! Upgrade to premium for unlimited tags;\n<https://gaminggeek.dev/patreon>')
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
		'''PFXtag delete <name>'''
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
		'''PFXfetchchannel <channel>'''
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

	@commands.command(description='Fetch a channel from it\'s id or link')
	async def fetchmsg(self, ctx, msg: typing.Union[str, int] = None):
		'''PFXfetchmsg <message id|message url>'''
		try:
			msg = int(msg)
		except Exception:
			pass
		if type(msg) == int:
			message = None
			try:
				message = await ctx.channel.fetch_message(msg)
				uperms = ctx.author.permissions_in(ctx.channel)
				if not uperms.read_messages:
					return
			except:
				for channel in ctx.guild.text_channels:
					perms = ctx.guild.me.permissions_in(channel)
					if channel == ctx.channel or not perms.read_messages or not perms.read_message_history:
						continue

					try:
						message = await channel.fetch_message(msg)
					except:
						continue
					else:
						break
			if message:
				uperms = ctx.author.permissions_in(message.channel)
				if not uperms.read_messages:
					return
				raw = await ctx.bot.http.get_message(message.channel.id, message.id)
				try:
					mjson = json.dumps(raw, indent=2).replace('`', '\`')
					await ctx.send("```json\n{}```".format(mjson))
				except discord.HTTPException as e:
					e = str(e)
					if 'Must be 2000 or fewer in length' in e:
						paginator = WrappedPaginator(prefix='```json', suffix='```', max_size=1895)
						paginator.add_line(json.dumps(raw, indent=2).replace('`', '\`'))
						interface = PaginatorInterface(ctx.bot, paginator, owner=ctx.author)
						await interface.send_to(ctx)
			else:
				raise commands.UserInputError('Message could not be found. Make sure you have the right id')
		elif type(msg) == str:
			for i in msg.split():
				word = i.lower().strip('<>')
				if word.startswith('https://canary.discordapp.com/channels/'):
					word = word.strip('https://canary.discordapp.com/channels/')
				elif word.startswith('https://ptb.discordapp.com/channels/'):
					word = word.strip('https://ptb.discordapp.com/channels/')
				elif word.startswith('https://discordapp.com/channels/'):
					word = word.strip('https://discordapp.com/channels/')
				else:
					continue
			list_ids = word.split('/')
			try:
				test = list_ids[1]
			except IndexError:
				raise commands.UserInputError(f'Unable to retrieve a message from {msg}')
			if len(list_ids) == 3:
				del list_ids[0]
			chanid = list_ids[0]
			msgid = list_ids[1]
			raw = await ctx.bot.http.get_message(chanid, msgid)
			chan = self.bot.get_channel(int(chanid))
			if not chan:
				return
			user = chan.guild.get_member(ctx.author.id)
			if not user:
				return
			uperms = user.permissions_in(chan)
			if not uperms.read_messages:
				return
			try:
				mjson = json.dumps(raw, indent=2).replace('`', '\`')
				await ctx.send("```json\n{}```".format(mjson))
			except discord.HTTPException as e:
				e = str(e)
				if 'Must be 2000 or fewer in length' in e:
					paginator = WrappedPaginator(prefix='```json', suffix='```', max_size=1895)
					paginator.add_line(json.dumps(raw, indent=2).replace('`', '\`'))
					interface = PaginatorInterface(ctx.bot, paginator, owner=ctx.author)
					await interface.send_to(ctx)
		else:
			raise commands.UserInputError('Message argument was neither an id or url')


	@commands.command(description='Find a user from their id')
	async def fetchuser(self, ctx, user: int = None):
		'''PFXfetchuser <id>'''
		if user == None:
			user = ctx.message.author.id
		try:
			fetched = await self.bot.fetch_user(user)
		except discord.NotFound:
			raise commands.UserInputError('Hmm.... I can\'t seem to find that user')
			return
		except discord.HTTPException:
			raise commands.UserInputError('Something went wrong when trying to find that user...')
			return
		userInfo = {
			'name': fetched.name,
			'discrim': fetched.discriminator,
			'id': fetched.id,
			'bot': fetched.bot,
			'avatar': fetched.avatar
		}
		user = json.dumps(userInfo, indent=2)
		embed = discord.Embed(title=f'Found user {fetched}', description=f'```json\n{user}```')
		await ctx.send(embed=embed)

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
		'''PFXtts <text>'''
		fp = await self.bot.loop.run_in_executor(None, functools.partial(self.gtts, text))
		ttsfile = discord.File(f'{fp}.mp3', f'{ctx.author}.mp3')
		await ctx.send(file=ttsfile)
		os.remove(f'{fp}.mp3')
		
def setup(bot):
	bot.add_cog(utils(bot))
