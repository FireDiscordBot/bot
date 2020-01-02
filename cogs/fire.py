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

from jishaku.paginators import PaginatorInterface, PaginatorEmbedInterface, WrappedPaginator
from fire.converters import Member
from discord.ext import commands
from aiotrello import Trello
from typing import Union
import discord
import datetime
import os
import platform
import json
import time
import psutil
import asyncio
import traceback
import humanfriendly
import inspect
import textwrap
import io
import copy
import aiohttp
import subprocess
import random

launchtime = datetime.datetime.utcnow()
process = psutil.Process(os.getpid())

print("fire.py has been loaded")

def getconfig(path: str = None):
	with open('config.json', 'r') as cfg:
		config = json.load(cfg)
	if path != None:
		return config[path]
	else:
		return config

config = getconfig()

def isadmin(ctx):
	"""Checks if the author is an admin"""
	if str(ctx.author.id) not in getconfig('admins'):
		admin = False
	else:
		admin = True
	return admin

class firecog(commands.Cog, name="Main Commands"):
	def __init__(self, bot):
		self.bot = bot
		self.trello = Trello(key=config['trellokey'], token=config['trellotoken'])
		self.launchtime = launchtime
		self._last_result = None

	def cleanup_code(self, content):
		if content.startswith('```') and content.endswith('```'):
			return '\n'.join(content.split('\n')[1:-1])

		return content.strip('` \n')

	@commands.command(name="invite")
	async def inviteme(self, ctx):
		return await ctx.send("https://gaminggeek.dev/fire")

	@commands.command(name='shut')
	async def shut(self, ctx):
		await ctx.send('https://shutplea.se/')

	@commands.command(description="Shows you my ping to discord's servers")
	async def ping(self, ctx):
		"""PFXping"""
		latency = round(self.bot.latency * 1000)
		start = round(time.time()*1000)
		msg = await ctx.send(content="Pinging...")
		end = round(time.time()*1000)
		elapsed = round(end - start)
		color = ctx.author.color
		embed = discord.Embed(title=f":ping_pong: {elapsed}ms.\n:heartpulse: {latency}ms.", colour=color, timestamp=datetime.datetime.utcnow())
		await msg.edit(content="`Pong!`", embed=embed)

	@commands.command(description="Suggest a feature")
	@commands.cooldown(1, 300, commands.BucketType.user)
	async def suggest(self, ctx, *, suggestion: str):
		"""PFXsuggest <suggestion>"""
		if suggestion == None:
			await ctx.send("You can't suggest nothing!")
		else:
			board = await self.trello.get_board(lambda b: b.name == "Fire")
			suggestions = await board.get_list(lambda l: l.name == "Suggestions")
			card = await suggestions.create_card(suggestion, f"Suggested by {ctx.author.name} ({ctx.author.id})")
			now = datetime.datetime.utcnow().strftime('%d/%m/%Y @ %I:%M:%S %p')
			await card.add_comment(f"Suggested in channel {ctx.channel.name} ({ctx.channel.id}) in guild {ctx.guild.name} ({ctx.guild.id}) at {now} UTC")
			await ctx.send(f"Thanks! Your suggestion was added to the Trello @ <{card.url}>. Any abuse will lead to being blacklisted from Fire!")

	@commands.command(description="Shows you some stats about me.", aliases=['about'])
	async def stats(self, ctx):
		"""PFXstats"""
		msg = await ctx.send('Gathering info...')
		delta_uptime = datetime.datetime.utcnow() - launchtime
		hours, remainder = divmod(int(delta_uptime.total_seconds()), 3600)
		minutes, seconds = divmod(remainder, 60)
		days, hours = divmod(hours, 24)
		uptime = f"{days}d, {hours}h, {minutes}m, {seconds}s"
		cpustats = psutil.cpu_percent()
		ramuse = (process.memory_info().rss / 1024) / 1000
		online = 0
		idle = 0
		dnd = 0
		offline = 0
		streaming = 0
		members = self.bot.get_all_members()
		for member in members:
			if str(member.status) == 'online':
				online = online + 1
			if str(member.status) == 'idle':
				idle = idle + 1
			if str(member.status) == 'dnd':
				dnd = dnd + 1
			if str(member.status) == 'offline':
				offline = offline + 1
			try:
				activity = member.activities[0]
				if isinstance(member.activities[0], discord.activity.Streaming):
					streaming = streaming + 1
			except Exception:
				pass
		users = online + idle + dnd + offline
		embed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
		ownerboi = self.bot.get_user(287698408855044097)
		embed.set_author(name=f"Bot made by {ownerboi}", url="https://gaminggeek.dev", icon_url=str(ownerboi.avatar_url_as(static_format='png', size=2048)))
		embed.add_field(name="Runtime", value=f"{uptime}", inline=False)
		embed.add_field(name="CPU", value=f"{round(cpustats)}%", inline=False)
		embed.add_field(name="RAM", value=f"{ramuse} MB", inline=False)
		embed.add_field(name="Version Info", value=f"discord.py {discord.__version__} | Python: 3.7.4", inline=False)
		embed.add_field(name="Guilds", value=f"{len(self.bot.guilds)}", inline=True)
		embed.add_field(name="Prefix", value=f"{ctx.prefix}", inline=True)
		embed.add_field(name="Commands", value=len(self.bot.commands), inline=True)
		embed.add_field(name="Members", value=f"{self.bot.get_emoji(313956277808005120)} {online:,d}\n{self.bot.get_emoji(313956277220802560)} {idle:,d}\n{self.bot.get_emoji(313956276893646850)} {dnd:,d}\n{self.bot.get_emoji(313956277132853248)} {streaming:,d}\n{self.bot.get_emoji(313956277237710868)} {offline:,d}\nTotal: {users:,d}\n ", inline=False)
		await msg.edit(content=None, embed=embed)

	@commands.command(description="Shows you all the guilds I'm in.")
	async def listguilds(self, ctx):
		"""PFXlistguilds"""
		if not isadmin(ctx):
			return
		paginator = WrappedPaginator(prefix='```vbs', suffix='```', max_size=1500)
		gcount = 1
		for guild in self.bot.guilds:
			if guild == ctx.guild:
				current = ' (HERE)'
			else:
				current = ''
			#paginator.add_line(f'[{gcount}] {guild.name}{current} || {guild.owner} || {guild.member_count} Members')
			paginator.add_line(f'[{gcount}] {guild.name}{current} || {guild.owner} || {guild.member_count} Members')
			gcount = gcount + 1
		interface = PaginatorInterface(ctx.bot, paginator, owner=ctx.author)
		await interface.send_to(ctx)

	@commands.command(name='rpc', description='View someone\'s rich presence')
	async def rpc(self, ctx, *, member: Member = None, MSG: discord.Message = None, ACT: int = 0):
		"""PFXrpc [<member>]"""
		if not member:
			member = ctx.author
		if ACT == -1:
			return
		try:
			activity = member.activities[ACT]
		except IndexError:
			if ACT != 0:
				return
			activity = None
		embed = None
		if activity != None:
			if activity.name == 'Spotify':
				adict = activity.to_dict()
				embed = discord.Embed(color=activity.color, timestamp=datetime.datetime.utcnow())
				embed.set_author(name=f'{member}\'s Spotify Info', icon_url='https://cdn.discordapp.com/emojis/471412444716072960.png')
				embed.add_field(name='Song', value=activity.title, inline=False)
				embed.add_field(name='Artists', value=', '.join(activity.artists), inline=False)
				embed.add_field(name='Album', value=activity.album, inline=False)
				duration = humanfriendly.format_timespan(activity.duration)
				now = datetime.datetime.utcnow()
				elapsed = humanfriendly.format_timespan(now - activity.start)
				left = humanfriendly.format_timespan(activity.end - now)
				if 'day' in left:
					left = '0:00:00'
				embed.add_field(name='Times', value=f'Duration: {duration}\nElapsed: {elapsed}\nLeft: {left}', inline=False)
				embed.add_field(name='Listen to this track', value=f'[{activity.title}](https://open.spotify.com/track/{activity.track_id})', inline=False)
				embed.set_thumbnail(url=activity.album_cover_url)
			elif type(activity) == discord.Streaming:
				embed = discord.Embed(color=discord.Color.purple(), timestamp=datetime.datetime.utcnow())
				embed.set_author(name=f'{member}\'s Stream Info', icon_url='https://cdn.discordapp.com/emojis/603188557242433539.png')
				if member.bot:
					embed.add_field(name='Title', value=activity.name, inline=False)
				else:
					embed.add_field(name='Title', value=activity.name, inline=False)
					embed.add_field(name='Twitch Name', value=activity.twitch_name, inline=False)
					if activity.details != None:	
						embed.add_field(name='Game', value=activity.details, inline=False)
					embed.add_field(name='URL', value=f'[{activity.twitch_name}]({activity.url})', inline=False)
			elif type(activity) == discord.Activity:
				embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow())
				if activity.small_image_url != None:
					embed.set_author(name=f'{member}\'s Game Info', icon_url=activity.small_image_url)
				else:
					embed.set_author(name=f'{member}\'s Game Info')
				embed.add_field(name='Game', value=activity.name, inline=False)
				now = datetime.datetime.utcnow()
				elapsed = None
				if activity.start:
					elapsed = humanfriendly.format_timespan(now - activity.start)
				if activity.details != None and activity.state != None and elapsed != None:
					embed.add_field(name='Details', value=f'{activity.details}\n{activity.state}\n{elapsed} elapsed', inline=False)
				elif activity.state != None and elapsed != None:
					embed.add_field(name='Details', value=f'{activity.state}\n{elapsed} elapsed', inline=False)
				elif activity.details != None and elapsed != None:
					embed.add_field(name='Details', value=f'{activity.details}\n{elapsed} elapsed', inline=False)
				elif activity.details != None and activity.state !=None and elapsed == None:
					embed.add_field(name='Details', value=f'{activity.details}\n{activity.state}', inline=False)
				elif activity.state != None and elapsed == None:
					embed.add_field(name='Details', value=f'{activity.state}', inline=False)
				elif activity.details != None and elapsed == None:
					embed.add_field(name='Details', value=f'{activity.details}', inline=False)
				if activity.large_image_url != None:
					embed.set_thumbnail(url=activity.large_image_url)
				else:
					pass
			if embed:
				if MSG:
					await MSG.edit(embed=embed)

					def react_check(reaction, user):
						return user.id == ctx.author.id
					try:
						reaction, user = await self.bot.wait_for('reaction_add', check=react_check, timeout=120)
					except asyncio.TimeoutError:
						return
					if reaction.emoji == '⏹':
						await MSG.delete()
					elif reaction.emoji == '◀':
						await MSG.remove_reaction('◀', ctx.author)
						await ctx.invoke(self.bot.get_command('rpc'), member=member, MSG=MSG, ACT=ACT-1)
					elif reaction.emoji == '▶':
						await MSG.remove_reaction('▶', ctx.author)
						await ctx.invoke(self.bot.get_command('rpc'), member=member, MSG=MSG, ACT=ACT+1)
				else:
					MSG = await ctx.send(embed=embed)
					await MSG.add_reaction('⏹')
					await MSG.add_reaction('◀')
					await MSG.add_reaction('▶')

					def react_check(reaction, user):
						return user.id == ctx.author.id
					try:
						reaction, user = await self.bot.wait_for('reaction_add', check=react_check, timeout=120)
					except asyncio.TimeoutError:
						return
					if reaction.emoji == '⏹':
						await MSG.delete()
					elif reaction.emoji == '◀':
						await MSG.remove_reaction('◀', ctx.author)
						await ctx.invoke(self.bot.get_command('rpc'), member=member, MSG=MSG, ACT=ACT-1)
					elif reaction.emoji == '▶':
						await MSG.remove_reaction('▶', ctx.author)
						await ctx.invoke(self.bot.get_command('rpc'), member=member, MSG=MSG, ACT=ACT+1)
			else:
				await ctx.send(f'{discord.utils.escape_mentions(discord.utils.escape_markdown(str(member)))} doesn\'t seem to be playing something with rich presence integration...')
		else:
			await ctx.send(f'{discord.utils.escape_mentions(discord.utils.escape_markdown(str(member)))} doesn\'t seem to be playing something with rich presence integration...')
				

	@commands.command(description="dab")
	async def dab(self, ctx):
		"""PFXdab"""
		await ctx.send(f"{ctx.message.author.mention}, <o/")

	@commands.command(description="idk")
	async def warm(self, ctx, *, warm: str):
		"""PFXwarm <item>"""
		await ctx.send(f'🔥 Warming up {discord.utils.escape_mentions(discord.utils.escape_markdown(warm))}')

	@commands.command(description='Cow goes moo')
	async def cowsay(self, ctx, *, cow: str):
		"""PFXcowsay <text>"""
		async with aiohttp.ClientSession() as session:
			async with session.get(f'http://cowsay.morecode.org/say?message={cow}&format=json') as resp:
				body = await resp.json()
		cow = body['cow']
		cow = discord.utils.escape_mentions(cow).replace('`', '')
		await ctx.send(f'```{cow}```')

	@commands.command(description='ascii text')
	async def ascii(self, ctx, *, text: str):
		"""PFXascii <text>"""
		textsplit = text.split(' ')
		text = '+'.join(textsplit)
		async with aiohttp.ClientSession() as session:
			async with session.get(f'http://artii.herokuapp.com/make?text={text}') as resp:
				body = await resp.text()
		try:
			asciimsg = discord.utils.escape_mentions(body).replace('`', '')
			await ctx.send(f'```{asciimsg}```')
		except discord.HTTPException as e:
			e = str(e)
			if 'Must be 2000 or fewer in length.' in e:
				return await ctx.send('That message is too long. Try a shorter one!')

	@commands.command(name='👏', aliases=['clap'], description='Emphasize your message with claps')
	async def clap(self, ctx, *, clappyboi: str = 'You need to provide a message for me to emphasize'):
		'''PFXclap <message>'''
		message = discord.utils.escape_mentions(clappyboi)
		message = message.split(' ')
		message = ' 👏 '.join(message)
		await ctx.send(message + ' 👏')

	@commands.command(name="8ball")
	async def eightball(self, ctx, *, q: str = None):
		if not q:
			return await ctx.send(f'<a:fireFailed:603214400748257302> You need to ask a question!')
		possible = ["It is certain.", "It is decidedly so.", "Without a doubt.", "Yes - definitely.", "You may rely on it.", "As I see it, yes.", "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.", 
			"Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.",
			"Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful."]
		answer = random.choice(possible)
		await ctx.send(answer)

def setup(bot):
	bot.add_cog(firecog(bot))
