import discord
from discord.ext import commands
import datetime
import os
import platform
import json
import time
import psutil
import asyncio
import traceback
import inspect
import textwrap
from contextlib import redirect_stdout
import io
import copy
from typing import Union
import speedtest
import subprocess
import random
import dataset
from jishaku.paginators import PaginatorInterface, WrappedPaginator

db = dataset.connect('sqlite:///fire.db')
prefixes = db['prefixes']

launchtime = datetime.datetime.utcnow()
process = psutil.Process(os.getpid())
autotipRestart = True


print("fire.py has been loaded")

def config(path: str = None):
	with open('config.json', 'r') as cfg:
		config = json.load(cfg)
	if path != None:
		return config[path]
	else:
		return config


def isadmin(ctx):
	"""Checks if the author is an admin"""
	if str(ctx.author.id) not in config('admins'):
		admin = False
	else:
		admin = True
	return admin

async def getprefix(ctx):
	"""Get the prefix from context (ctx)"""
	if not ctx.guild:
		return "$"
	prefixraw = prefixes.find_one(gid=ctx.guild.id)
	if prefixraw != None:
		prefix = prefixraw['prefix']
	else:
		prefix = "$"
	return prefix

class fire(commands.Cog, name="Main Commands"):
	def __init__(self, bot):
		self.bot = bot
		self._last_result = None

	def cleanup_code(self, content):
		if content.startswith('```') and content.endswith('```'):
			return '\n'.join(content.split('\n')[1:-1])

		return content.strip('` \n')
  
	@commands.command(description="Shows you my ping to discord's servers")
	async def ping(self, ctx):
		"""Shows you my ping to discord's servers"""
		latency = round(self.bot.latency * 1000)
		start = round(time.time()*1000)
		msg = await ctx.send(content="Pinging...")
		end = round(time.time()*1000)
		elapsed = round(end - start)
		color = ctx.author.color
		embed = discord.Embed(title=f":ping_pong: {elapsed}ms.\n:heartpulse: {latency}ms.", colour=color, timestamp=datetime.datetime.now())
		await msg.edit(content="`Pong!`", embed=embed)

	@commands.command(description="Suggest a feature")
	async def suggest(self, ctx, *, suggestion: str):
		"""Suggest a feature"""
		if suggestion == None:
			await ctx.send("You can't suggest nothing!")
		else:
			await ctx.send("Thanks! Your suggestions help improve Fire.")
			me = self.bot.get_user(287698408855044097)
			await me.send(f"{ctx.message.author} suggested: {suggestion}")

	@commands.command(description="Shows you some stats about me.", aliases=['about'])
	async def stats(self, ctx):
		"""Shows you some stats about me."""
		msg = await ctx.send('Gathering info...')
		delta_uptime = datetime.datetime.utcnow() - launchtime
		hours, remainder = divmod(int(delta_uptime.total_seconds()), 3600)
		minutes, seconds = divmod(remainder, 60)
		days, hours = divmod(hours, 24)
		uptime = f"{days}d, {hours}h, {minutes}m, {seconds}s"
		os = "Windows Server 2016"
		cpu = "Intel™ Dual Xeon E5-2630"
		cpustats = psutil.cpu_percent()
		ramuse = (process.memory_info().rss / 1024) / 1000
		custprefix = await getprefix(ctx)
		online = 0
		idle = 0
		dnd = 0
		offline = 0
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
		users = format(len(self.bot.users), ',d')
		embed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.now())
		embed.set_author(name="Bot made by Geek#9999", url="https://gaminggeek.club", icon_url="https://cdn.discordapp.com/avatars/287698408855044097/7d8707c0556bdbe5e29b2b0788de8ca9.png?size=1024")
		embed.add_field(name="**Runtime**", value=f"{uptime}", inline=False)
		embed.add_field(name="**OS**", value=f"{os}", inline=False)
		embed.add_field(name="**CPU**", value=f"{cpu} ({round(cpustats)}%)", inline=False)
		embed.add_field(name="**RAM**", value=f"{ramuse} MB / 6024 MB", inline=False)
		embed.add_field(name="**Version Info**", value=f"discord.py {discord.__version__} | Python: 3.7.2", inline=False)
		embed.add_field(name="**Guilds**", value=f"{len(self.bot.guilds)}", inline=True)
		embed.add_field(name="**Prefix**", value=f"{custprefix}", inline=True)
		embed.add_field(name="**Commands**", value=len(self.bot.commands), inline=True)
		embed.add_field(name="**Members**", value=f"{self.bot.get_emoji(313956277808005120)} {online:,d}\n{self.bot.get_emoji(313956277220802560)} {idle:,d}\n{self.bot.get_emoji(313956276893646850)} {dnd:,d}\n{self.bot.get_emoji(313956277237710868)} {offline:,d}\nTotal: {users}\n ", inline=False)
		await msg.edit(content=None, embed=embed)

	@commands.command(description="Shows you all the guilds I'm in.")
	async def listguilds(self, ctx):
		"""Shows you all the guilds I'm in."""
		paginator = WrappedPaginator(prefix='```vbs', suffix='```', max_size=1500)
		gcount = 1
		for guild in self.bot.guilds:
			if guild == ctx.guild:
				current = ' (HERE)'
			else:
				current = ''
			paginator.add_line(f'[{gcount}] {guild.name}{current} || {guild.owner} || {guild.member_count} Members')
			gcount = gcount + 1
		interface = PaginatorInterface(ctx.bot, paginator, owner=ctx.author)
		await interface.send_to(ctx)

	@commands.command(description="dab")
	async def dab(self, ctx):
		"""<o/"""
		await ctx.send(f"{ctx.message.author.mention}, <o/")

	@commands.command(description="idk")
	async def warm(self, ctx, *, warm: str):
		"""warm something up. idk"""
		await ctx.send(f'🔥 Warming up {warm}')

	@commands.command(description="Say goodbye to me")
	@commands.has_permissions(manage_members=True)
	async def leaveguild(self, ctx):
		"""Makes me leave the guild :("""
		confirm = random.randint(5000, 10000)
		await ctx.send(f'Are you sure? I won\'t be able to come back unless someone with `Manage Server` permission reinvites me.\nFor confirmation, please repeat this code... {confirm}')
		
		def check(m):
			return m.content == f'{confirm}' and m.author == ctx.message.author

		await self.bot.wait_for('message', check=check)
		await ctx.send('Goodbye! :wave:')
		guild = ctx.guild
		await guild.leave()
	

	@commands.command(description="Changes whether the autotip bot restarts or not", hidden=True)
	async def togglerestart(self, ctx, restart: bool = True):
		if isadmin(ctx):
			conf = config()
			conf["autotipRestart"] = restart
			try:
				with open('config.json', 'w') as cfg:
					json.dump(conf, cfg)
				await ctx.send(f"Autotip Restart: {config('autotipRestart')}")
			except Exception as e:
				await ctx.send(f"Fire did an oopsie ```{e}```")

	@commands.Cog.listener()
	async def on_message(self, message):
		channel = message.channel
		if channel.id == 544488595528876043:
			if message.content == "CtrlShiftI disconnected!":
				if config('autotipRestart') == True:
					me = self.bot.get_user(287698408855044097)
					await channel.send(f"Autotip bot is restarting {me.mention}")
					os.system('pm2 restart 0')

def setup(bot):
	bot.add_cog(fire(bot))