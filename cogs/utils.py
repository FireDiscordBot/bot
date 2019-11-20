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
from colormap import rgb2hex, hex2rgb
from emoji import UNICODE_EMOJI
from jishaku.paginators import PaginatorInterface, PaginatorEmbedInterface, WrappedPaginator
from PIL import Image
from PIL import ImageFilter
from PIL import ImageFont
from PIL import ImageDraw
from io import BytesIO
from gtts import gTTS
from fire.converters import User, UserWithFallback, Member, TextChannel, VoiceChannel, Category, Role
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
		embed = discord.Embed(description = '\n'.join(lines), timestamp = message.created_at)
	else:
		lines = []
		msg = message.system_content.split('\n')
		for line in msg:
			lines.append(f'> {line}')
		embed = discord.Embed(description = '\n'.join(lines), color = message.author.color, timestamp = message.created_at)
	embed.set_author(name = str(message.author), icon_url = str(message.author.avatar_url))
	if message.attachments and not edited:
		embed.add_field(name = 'Attachment(s)', value = '\n'.join([attachment.filename for attachment in message.attachments]) + '\n\n__Attachment URLs are invalidated once the message is deleted.__')
	if message.channel != context_channel:
		embed.set_footer(text = 'Sniped by: ' + str(user) + ' | in channel: #' + message.channel.name)
	else:
		embed.set_footer(text = 'Sniped by: ' + str(user))
	return embed

def quote_embed(context_channel, message, user):
	if not message.system_content and message.embeds and message.author.bot:
		embed = message.embeds[0]
	else:
		if message.author not in message.guild.members or message.author.color == discord.Colour.default():
			lines = []
			embed = discord.Embed(timestamp = message.created_at)
			if message.system_content:
				msg = message.system_content.split('\n')
				for line in msg:
					lines.append(f'> {line}')
				embed.add_field(name='Message', value='\n'.join(lines) or 'null', inline=False)
			embed.add_field(name='Jump URL', value=f'[Click Here]({message.jump_url})', inline=False)
		else:
			embed = discord.Embed(color = message.author.color, timestamp = message.created_at)
			lines = []
			if message.system_content:
				msg = message.system_content.split('\n')
				for line in msg:
					lines.append(f'> {line}')
				embed.add_field(name='Message', value='\n'.join(lines) or 'null', inline=False)
			embed.add_field(name='Jump URL', value=f'[Click Here]({message.jump_url})', inline=False)
		if message.attachments:
			if message.channel.is_nsfw() and not context_channel.is_nsfw():
				embed.add_field(name = 'Attachments', value = ':underage: Quoted message is from an NSFW channel.')
			elif len(message.attachments) == 1 and message.attachments[0].url.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.gifv', '.webp', '.bmp')):
				embed.set_image(url = message.attachments[0].url)
			else:
				for attachment in message.attachments:
					embed.add_field(name = 'Attachment', value = '[' + attachment.filename + '](' + attachment.url + ')', inline = False)
		embed.set_author(name = str(message.author), icon_url = str(message.author.avatar_url), url = 'https://discordapp.com/channels/' + str(message.guild.id) + '/' + str(message.channel.id) + '/' + str(message.id))
		if message.channel != context_channel:
			embed.set_footer(text = 'Quoted by: ' + str(user) + ' | #' + message.channel.name)
		else:
			embed.set_footer(text = 'Quoted by: ' + str(user))
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
	'add_reactions': 'React',
	'administrator': 'Admin',
	'attach_files': 'Upload Files',
	'ban_members': 'Ban',
	'change_nickname': 'Change Nick',
	'connect': 'Connect',
	'create_instant_invite': 'Create Invite',
	'deafen_members': 'Server Deafen',
	'embed_links': 'Link Embeds',
	'external_emojis': 'External Emojis',
	'kick_members': 'Kick',
	'manage_channels': 'Manage Channels',
	'manage_emojis': 'Manage Emojis',
	'manage_guild': 'Manage Guild',
	'manage_messages': 'Manage Messages',
	'manage_nicknames': 'Manage Nicks',
	'manage_roles': 'Manage Roles',
	'manage_webhooks': 'Manage Webhooks',
	'mention_everyone': 'Mention Everyone',
	'move_members': 'Move Members',
	'mute_members': 'Mute Members',
	'priority_speaker': 'Priority Speaker',
	'read_message_history': 'Read Past Messages',
	'read_messages': 'Read Messages',
	'send_messages': 'Send Messages',
	'send_tts_messages': 'Send TTS Messages',
	'speak': 'Talk',
	'stream': 'Go Live',
	'use_voice_activation': 'Use Voice Activation',
	'view_audit_log': 'View Logs'
}

dehoistchars = 'abcdefghijklmnopqrstuvwxyz'

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
		self.bot.descriptions = {}
		if 'slack_messages' not in dir(self.bot):
 			self.bot.slack_messages = {}
		self.bot.getvanity = self.getvanity
		self.bot.getvanitygid = self.getvanitygid
		self.bot.vanityclick = self.vanityclick
		self.bot.vanitylink = self.vanitylink
		self.tags = {}
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
		query = 'SELECT * FROM vanity;'
		vanitys = await self.bot.db.fetch(query)
		for v in vanitys:
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

	@commands.Cog.listener()
	async def on_ready(self):
		await asyncio.sleep(5)
		await self.loadvanitys()
		await self.loadtags()
		await self.loaddescs()
		print('Settings loaded!')

	@commands.command(name='loadvanity', description='Load Vanity URLs', hidden=True)
	async def loadvurls(self, ctx):
		'''PFXloadvanity'''
		if await self.bot.is_team_owner(ctx.author):
			await self.loadvanitys()
			await ctx.send('Loaded data!')
		else:
			await ctx.send('no.')

	@commands.command(name='loadtags', description='Load Tags', hidden=True)
	async def loadthetags(self, ctx):
		'''PFXloadtags'''
		if await self.bot.is_team_owner(ctx.author):
			await self.loadtags()
			await ctx.send('Loaded data!')
		else:
			await ctx.send('no.')

	async def cog_check(self, ctx: commands.Context):
		if ctx.command.name == 'tts'  and ctx.guild.id == 411619823445999637 or ctx.command.name == 'snipe' and ctx.guild.id == 411619823445999637:
			await ctx.send('<a:fireFailed:603214400748257302> This command has been disabled due to abuse.')
			return False
		return True

	@commands.command(name='errortest', hidden=True)
	async def errortestboyo(self, ctx):
		if await commands.is_owner(ctx):
			test = [1, 2]
			return test[2]

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

	featureslist = {
		'PARTNERED': '[Partnered](https://dis.gd/partners)',
		'VERIFIED': '[Verified](https://dis.gd/verified)',
		'COMMERCE': '[Store Channels](https://dis.gd/sell-your-game)',
		'NEWS': '[Announcement Channels](https://support.discordapp.com/hc/en-us/articles/360032008192)',
		'FEATUREABLE': '[Featurable](https://discordapp.com/activity)',
		'DISCOVERABLE': '[Discoverable](https://discordapp.com/guild-discovery)',
		'PUBLIC': '[Public](https://bit.ly/2kV6ogn)',
		'VANITY_URL': 'Vanity URL',
		'ANIMATED_ICON': 'Animated Icon',
		'BANNER': 'Banner',
		'INVITE_SPLASH': 'Invite Splash',
		'MORE_EMOJI': 'More Emoji',
		'VIP_REGIONS': 'VIP Regions'
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
			nameemote = discord.utils.get(self.bot.emojis, name='PartnerShine')
		elif 'VERIFIED' in guild.features:
			nameemote = discord.utils.get(self.bot.emojis, name='verified')
		embed.add_field(name="» Name", value=f'{guild.name} {nameemote}', inline=True)
		embed.add_field(name="» ID", value=guild.id, inline=True)
		embed.add_field(name="» Members", value=guild.member_count, inline=True)
		embed.add_field(name="» Channels", value=f"Text: {len(guild.text_channels)} | Voice: {len(guild.voice_channels)}", inline=True)
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
			if 'ACK' in role.name and guild.id == 564052798044504084:
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
	async def user(self, ctx, user: typing.Union[Member, UserWithFallback] = None):
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
		ack = []
		fireg = self.bot.get_guild(564052798044504084).get_member(user.id)
		if fireg:
			for role in fireg.roles:
				if 'ACK |' in role.name:
					ack.append(role.name.replace('ACK | ', ''))
		embed = discord.Embed(colour=color, timestamp=datetime.datetime.utcnow())
		embed.set_thumbnail(url=str(user.avatar_url))
		embed.add_field(name="» Name", value=f'{user.name}#{user.discriminator}', inline=False)
		embed.add_field(name="» ID", value=user.id, inline=False)
		if type(user) == discord.Member:
			members = sorted(ctx.guild.members, key=lambda m: m.joined_at or m.created_at)
			embed.add_field(name="» Join Position", value=members.index(user) + 1, inline=False)
		embed.add_field(name="» Created", value=humanfriendly.format_timespan(datetime.datetime.utcnow() - user.created_at, max_units=2) + ' ago', inline=False)
		if type(user) == discord.Member:
			if user.nick:
				embed.add_field(name="» Nickname", value=user.nick, inline=False)
			if user.premium_since:
				embed.add_field(name="» Boosting Since", value=str(user.premium_since).split('.')[0], inline=False)
			rgbcolor = user.color.to_rgb()
			embed.add_field(name="» Color", value=f'rgb{rgbcolor}', inline=False)
			roles = []
			for role in user.roles:
				if 'ACK' in role.name and ctx.guild.id == 564052798044504084:
					pass
				elif role.is_default():
					pass
				else:
					roles.append(role.mention)
			embed.add_field(name="» Roles", value=' - '.join(roles) or 'No roles', inline=False)
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
				if value:
					perms.append(permissions[perm] if perm in permissions else perm.replace('_', '').capitalize())
			if perms:
				embed.add_field(name="» Permissions", value=', '.join(perms), inline=False)
		else:
			embed.add_field(name="» Permissions", value='Administrator', inline=False)
		mask = Image.open('cogs/static/images/promotional-assets/fireavbase512.png')
		img = Image.open('cogs/static/images/promotional-assets/fireavbase512.png')
		sub_img = Image.new('RGBA', (512, 512), rgbcolor)
		img.paste(sub_img, (0, 0), mask)
		img.save(f'{role.id}.png')
		colorlogo = discord.File(f'{role.id}.png')
		embed.set_thumbnail(url=f'attachment://{role.id}.png')
		await ctx.send(embed=embed, file=colorlogo)
		os.remove(f'{role.id}.png')
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
				desc.append(f'<a:fireSuccess:603214443442077708> **{c["name"]}**: {c["status"].capitalize()}')
			else:
				desc.append(f'<a:fireFailed:603214400748257302> **{c["name"]}**: {c["status"].capitalize()}')
		embed = discord.Embed(color=colors[str(summary['status']['indicator'])], timestamp=datetime.datetime.utcnow(), description='\n'.join(desc))
		incident = incidents['incidents'][0]
		embed.add_field(name='Latest Incident', value=f'[{incident["name"]}]({incident["shortlink"]})\nStatus: **{incident["status"].capitalize()}**')
		await ctx.send(embed=embed)

	@commands.command(description='Bulk delete messages')
	@commands.has_permissions(manage_messages=True)
	async def purge(self, ctx, amount: int=-1, member: Member=None):
		'''PFXpurge <amount> [<user>]'''
		if amount>500 or amount<0:
			return await ctx.send('Invalid amount. Minumum is 1, Maximum is 500')
		try:
			await ctx.message.delete()
		except Exception:
			pass
		if member != None:
			def checkmember(m):
				return m.author == member
			amount += 1
			self.bot.recentpurge[ctx.channel.id] = []
			async for message in ctx.channel.history(limit=amount):
				if message.author == member:
					self.bot.recentpurge[ctx.channel.id].append({
						'author': str(message.author),
						'author_id': message.author.id,
						'content': message.content or '',
						'system_content': message.system_content if message.content == None else ''
					})
			await ctx.channel.purge(limit=amount, check=checkmember)
			amount -= 1
		else:
			self.bot.recentpurge[ctx.channel.id] = []
			async for message in ctx.channel.history(limit=amount):
				self.bot.recentpurge[ctx.channel.id].append({
					'author': str(message.author),
					'author_id': message.author.id,
					'content': message.content or '',
					'system_content': message.system_content if message.content == None else ''
				})
			await ctx.channel.purge(limit=amount)
		await ctx.send(f'Successfully deleted **{amount}** messages!', delete_after=5)

	@commands.command(name='followable', description='Make the current channel followable.')
	async def followable(self, ctx, canfollow: bool = False):
		if not await self.bot.is_team_owner():
			return
		if canfollow and ctx.channel.id not in self.channelfollowable:
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO followable (\"cid\") VALUES ($1);'
				await self.bot.db.execute(query, ctx.channel.id)
			await self.bot.db.release(con)
			await self.loadfollowable()
			return await ctx.send('<a:fireSuccess:603214443442077708> This channel can now be followed!')
		else:
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'DELETE FROM followable WHERE cid = $1;'
				await self.bot.db.execute(query, ctx.channel.id)
			await self.bot.db.release(con)
			await self.loadfollowable()
			return await ctx.send('<a:fireSuccess:603214443442077708> This channel is no longer followable')

	@commands.command(name='follow', description='Follow a channel and recieve messages from it in your own server', aliases=['cfollow', 'channelfollow'], hidden=True)
	async def follow(self, ctx, follow: typing.Union[TextChannel, str]):
		'''PFXfollow <channel|link>'''
		if not await self.bot.is_team_owner():
			return
		if isinstance(follow, discord.TextChannel):
			if follow.id in self.channelfollowable:
				return await ctx.send(f'Use this command in the channel you want to recieve messages from {follow.mention} in;\n`fire follow https://discordapp.com/channels/{ctx.guild.id}/{follow.id}`')
			else:
				return await ctx.send('<a:fireFailed:603214400748257302> This channel has not been made followable!')
		elif isinstance(follow, str):
			if 'https://discordapp.com/channels' not in follow:
				getchan = discord.utils.get(ctx.guild.channels, name=follow)
				if not getchan:
					return await ctx.send('<a:fireFailed:603214400748257302> Invalid argument! Please provide a channel or a link to follow')
				if isinstance(getchan, discord.TextChannel):
					follow = getchan
					if follow.id in self.channelfollowable:
						return await ctx.send(f'Use this command in the channel you want to recieve messages from {follow.mention} in;\n`fire follow https://discordapp.com/channels/{ctx.guild.id}/{follow.id}`')
					else:
						return await ctx.send('<a:fireFailed:603214400748257302> This channel has not been made followable!')
				elif isinstance(getchan, discord.VoiceChannel) or isinstance(getchan, discord.CategoryChannel):
					return await ctx.send('<a:fireFailed:603214400748257302> Invalid argument! Please provide a **text** channel or a link to follow')
			chanurl = follow.lower().strip('<>')
			if chanurl.startswith('https://canary.discordapp.com/channels/'):
				ids = chanurl.strip('https://canary.discordapp.com/channels/')
			elif chanurl.startswith('https://ptb.discordapp.com/channels/'):
				ids = chanurl.strip('https://ptb.discordapp.com/channels/')
			elif chanurl.startswith('https://discordapp.com/channels/'):
				ids = chanurl.strip('https://discordapp.com/channels/')
			id_list = ids.split('/')
			if len(id_list) != 2:
				return await ctx.send(f'<a:fireFailed:603214400748257302> Invalid argument! Make sure the link follows this format; https://discordapp.com/channels/{ctx.guild.id}/{ctx.channel.id}')
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO channelfollow (\"following\", \"gid\", \"cid\") VALUES ($1, $2, $3);'
				try:
					await self.bot.db.execute(query, chanurl, ctx.guild.id, ctx.channel.id)
				except asyncpg.exceptions.UniqueViolationError:
					try:
						return await ctx.send(f'<a:fireFailed:603214400748257302> Already following a channel here!')
					except Exception:
						return
			await self.bot.db.release(con)
			await self.loadfollows()
			return await ctx.send(f'<a:fireSuccess:603214443442077708> Now following <#{id_list[-1]}>')

	@commands.command(name='unfollow', description='Unfollow the channel that has been followed', hidden=True)
	async def unfollow(self, ctx):
		if not await self.bot.is_team_owner():
			return
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM channelfollow WHERE cid = $1;'
			await self.bot.db.execute(query, ctx.channel.id)
		await self.bot.db.release(con)
		await self.loadfollows()
		return await ctx.send(f'<a:fireSuccess:603214443442077708> Successfully unfollowed all followed channels')

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
		if 'fetchmsg' in message.content:
			return
		if 'quote' in message.content:
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
								await message.channel.send(embed = quote_embed(message.channel, msg_found, message.author))
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
								await ctx.send(content = 'Raw embed from `' + str(msg_found.author).strip('`') + '` in ' + msg_found.channel.mention, embed = quote_embed(ctx.channel, msg_found, ctx.author))
							else:
								await ctx.send(embed = quote_embed(ctx.channel, msg_found, ctx.author))

	@commands.command(description='Got a HTTP Error Code? My cat knows what it means.', name='http.cat')
	async def httpcat(self, ctx, error: int = 200):
		'''PFXhttp.cat <error code>'''
		embed = discord.Embed(color=ctx.author.color)
		embed.set_image(url=f'https://http.cat/{error}')
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
			embed.set_image(url=str(member.avatar_url_as(static_format='png', size=2048)))
			await ctx.send(embed=embed)
		else:
			embed = discord.Embed(color=user.color)
			embed.set_image(url=str(user.avatar_url))
			await ctx.send(embed=embed)

	@commands.command(description='Totally not a stolen idea from Dyno')
	async def fireav(self, ctx, u: Member = None):
		'''PFXfireav [<user>]'''
		if not u:
			u = ctx.author
		if isinstance(u, discord.Member):
			color = u.color
		else:
			color = ctx.author.color
		mask = Image.open('cogs/static/images/promotional-assets/fireavbase.png')
		img = Image.open('cogs/static/images/promotional-assets/fireavbase.png')
		av_bytes = await u.avatar_url_as(format='png', static_format='png', size=256).read()
		av_img = Image.open(BytesIO(av_bytes))
		sub_img = av_img.convert("RGBA")
		try:
			img.paste(sub_img, (0, 0), mask)
		except ValueError:
			return await ctx.send('I cannot make a Fire avatar with images smaller than 256x256')
		img.save(f'{u.id}.png')
		colorlogo = discord.File(f'{u.id}.png')
		embed = discord.Embed(colour=ctx.author.color)
		embed.set_image(url=f'attachment://{u.id}.png')
		await ctx.send(embed=embed, file=colorlogo)
		await asyncio.sleep(5)
		os.remove(f'{u.id}.png')

	@commands.command(description='Make a role mentionable for 60 seconds or until you mention it')
	@commands.bot_has_permissions(manage_roles=True)
	@commands.has_permissions(manage_roles=True)
	async def tempmention(self, ctx, *, role: Role):
		'''PFXtempmention <role>'''
		await role.edit(mentionable=True)
		await ctx.send(f'Successfully made **{role.name}** mentionable. It will stay mentionable until you mention it or 60 seconds go by', delete_after=5)
		def check(m):
			return m.author == ctx.author

		try:
			m = await self.bot.wait_for('message', timeout=60.0, check=check)
			await role.edit(mentionable=False)
		except asyncio.TimeoutError:
			await role.edit(mentionable=False)
			await ctx.send(f'**{role.name}** is no longer mentionable. 60 seconds have passed')

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
			return await ctx.send('<a:fireSuccess:603214443442077708> Reset guild description!')
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
		return await ctx.send('<a:fireSuccess:603214443442077708> Set guild description!')


	@commands.command(description='Creates a vanity invite for your Discord using https://oh-my-god.wtf/')
	@commands.bot_has_permissions(create_instant_invite=True)
	@commands.has_permissions(manage_guild=True)
	async def vanityurl(self, ctx, code: str = None):
		'''PFXvanityurl [<code>|"disable"]'''
		premiumguilds = self.bot.get_cog('Premium Commands').premiumGuilds
		if not code and not ctx.guild.id in premiumguilds:
			return await ctx.send('<a:fireFailed:603214400748257302> You need to provide a code!')
		elif not code:
			current = self.bot.getvanitygid(ctx.guild.id)
			statuses = ['online', 'idle', 'dnd']
			online = len([m for m in ctx.guild.members if str(m.status) in statuses])
			gonline = f'⬤ {online:,d} Online'
			gmembers = f'⭘ {len(ctx.guild.members):,d} Members'
			desc = self.bot.descriptions[ctx.guild.id] if ctx.guild.id in self.bot.descriptions else f'Check out {ctx.guild} on Discord'
			desc = f'{desc}\n\n{gonline} & {gmembers}'
			embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.utcnow(), description=desc)
			if not ctx.guild.splash_url or ctx.guild.banner_url:
				embed.set_thumbnail(url=str(ctx.guild.icon_url))
			else:
				image = ctx.guild.splash_url or ctx.guild.banner_url
				if ctx.guild.id == 564052798044504084:
					image = 'https://cdn.discordapp.com/app-assets/444871677176709141/store/630360840251506742.png?size=320'
					#please join my discord and boost so I can get an invite splash, https://oh-my-god.wtf/fire thank
				embed.set_image(url=str(image))
			embed.add_field(name='Clicks', value=current['clicks'])
			embed.add_field(name='Links', value=current['links'])
			return await ctx.send(embed=embed)
		if code.lower() == 'disable':
			await self.deletevanity(ctx)
			return await ctx.send('<a:fireSuccess:603214443442077708> Vanity URL deleted!')
		if not re.fullmatch(r'[a-zA-Z0-9]+', code):
			return await ctx.send('<a:fireFailed:603214400748257302> Vanity URLs can only contain characters A-Z0-9')
		if len(code) < 3 or len(code) > 10:
			return await ctx.send('<a:fireFailed:603214400748257302> The code needs to be 3-10 characters!')
		exists = self.bot.getvanity(code.lower())
		if exists:
			return await ctx.send('<a:fireFailed:603214400748257302> This code is already in use!')
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
			return await ctx.send(f'<a:fireSuccess:603214443442077708> Your Vanity URL is {vanity["url"]}')
		else:
			return await ctx.send('<a:fireFailed:603214400748257302> Something went wrong...')

	@commands.group(name='tags', aliases=['tag', 'dtag'], invoke_without_command=True)
	@commands.guild_only()
	async def tags(self, ctx, *, tagname: str = None):
		if not ctx.invoked_subcommand:
			taglist = self.tags[ctx.guild.id] if ctx.guild.id in self.tags else False
			if not taglist:
				return await ctx.send('<a:fireFailed:603214400748257302> No tags found.')
			if not tagname:
				taglist = ', '.join(taglist)
				embed = discord.Embed(title=f'{ctx.guild.name}\'s tags', color=ctx.author.color, description=taglist)
				return await ctx.send(embed=embed)
			else:
				tag = taglist[tagname.lower()] if tagname.lower() in taglist else False
				if not tag:
					return await ctx.send(f'<a:fireFailed:603214400748257302> No tag called {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))} found.')
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
			return await ctx.send(f'<a:fireFailed:603214400748257302> A tag with the name {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))} already exists')
		if len(currenttags) >= 20:
			premiumguilds = self.bot.get_cog('Premium Commands').premiumGuilds
			if ctx.guild.id not in premiumguilds:
				return await ctx.send(f'<a:fireFailed:603214400748257302> You\'ve reached the tag limit! Upgrade to premium for unlimited tags;\n<https://gaminggeek.dev/patreon>')
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'INSERT INTO tags (\"gid\", \"name\", \"content\") VALUES ($1, $2, $3);'
			await self.bot.db.execute(query, ctx.guild.id, tagname.lower(), tagcontent)
		await self.bot.db.release(con)
		await self.loadtags()
		return await ctx.send(f'<a:fireSuccess:603214443442077708> Successfully created the tag {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))}')

	@commands.has_permissions(manage_messages=True)
	@tags.command(name='delete', aliases=['del', 'remove'])
	async def tagdelete(self, ctx, tagname: str):
		'''PFXtag delete <name>'''
		currenttags = self.tags[ctx.guild.id] if ctx.guild.id in self.tags else []
		existing = currenttags[tagname.lower()] if tagname.lower() in currenttags else False
		if not existing:
			return await ctx.send(f'<a:fireFailed:603214400748257302> A tag with the name {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))} doesn\'t exist')
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM tags WHERE name = $1 AND gid = $2'
			await self.bot.db.execute(query, tagname.lower(), ctx.guild.id)
		await self.bot.db.release(con)
		await self.loadtags()
		return await ctx.send(f'<a:fireSuccess:603214443442077708> Successfully deleted the tag {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))}')

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
				return
			if len(list_ids) == 3:
				del list_ids[0]
			chanid = list_ids[0]
			msgid = list_ids[1]
			raw = await ctx.bot.http.get_message(chanid, msgid)
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
			fetched = self.bot.get_user(user)
		except Exception as e:
			raise commands.UserInputError('Oops, couldn\'t find that user. I need to be in a server with them')
		if fetched == None:
			if isadmin(ctx):
				try:
					fetched = await self.bot.fetch_user(user)
				except discord.NotFound:
					raise commands.UserInputError('Hmm.... I can\'t seem to find that user')
					return
				except discord.HTTPException:
					raise commands.UserInputError('Something went wrong when trying to find that user...')
					return
			else:
				raise commands.UserInputError('Hmm.... I can\'t seem to find that user')
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
