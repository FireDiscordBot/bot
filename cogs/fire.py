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
	if not ctx.guild:
		return "$"
	with open('prefixes.json', 'r') as pfx:
		customprefix = json.load(pfx)
	try:
		prefix = customprefix[str(ctx.guild.id)]
	except Exception:
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

	@commands.command(description="Shows you some stats about me.")
	async def stats(self, ctx):
		"""Shows you some stats about me."""
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
		color = ctx.author.color
		embed = discord.Embed(colour=color, timestamp=datetime.datetime.now())
		embed.set_author(name="Bot made by Geek#9999", url="https://gaminggeek.club", icon_url="https://cdn.discordapp.com/avatars/287698408855044097/7d8707c0556bdbe5e29b2b0788de8ca9.png?size=1024")
		embed.add_field(name="**Runtime**", value=f"{uptime}", inline=False)
		embed.add_field(name="**OS**", value=f"{os}", inline=False)
		embed.add_field(name="**CPU**", value=f"{cpu} ({round(cpustats)}%)", inline=False)
		embed.add_field(name="**RAM**", value=f"{ramuse} MB / 6024 MB", inline=False)
		embed.add_field(name="**Version Info**", value=f"Discord.py: Rewrite | Python: 3.7.2", inline=False)
		embed.add_field(name="**Guilds**", value=f"{len(self.bot.guilds)}", inline=True)
		embed.add_field(name="**Members**", value=f"{len(self.bot.users)}", inline=True)
		embed.add_field(name="**Prefix**", value=f"{custprefix}", inline=True)
		embed.add_field(name="**Commands**", value=len(self.bot.commands), inline=True)
		await ctx.send(embed=embed)
		if isadmin(ctx):
			await ctx.send(f'```sh\n        ,.=:!!t3Z3z.,                  Administrator@SilkyServersLTD\n       :tt:::tt333EE3                  -----------------------------\n       Et:::ztt33EEEL @Ee.,      ..,   OS: Windows Server 2016 Standard\n      ;tt:::tt333EE7 ;EEEEEEttttt33#   Host: Red Hat KVM\n     :Et:::zt333EEQ. $EEEEEttttt33QL   Kernel: 2.11.2(0.329/5/3)\n     it::::tt333EEF @EEEEEEttttt33F    Uptime: {uptime}\n    ;3=*^\'\'\'\"*4EEV :EEEEEEttttt33@.    Shell: bash 4.4.23\n    ,.=::::!t=., \' @EEEEEEtttz33QF     Resolution: 1024x768\n   ;::::::::zt33)   \"4EEEtttji3P*      DE: Aero\n  :t::::::::tt33.:Z3z..  \'\' ,..g.      WM: Explorer\n  i::::::::zt33F AEEEtttt::::ztF       WM Theme: aero\n ;:::::::::t33V ;EEEttttt::::t3        CPU: {cpu}\n E::::::::zt33L @EEEtttt::::z3F        GPU: Microsoft Basic Display Adapter\n(3=*^\'\'\'\"*4E3) ;EEEtttt:::::tZ\'        Memory: {ramuse} MB / 6024 MB\n             \' :EEEEtttt::::z7\n                 \"VEzjt:;;z>*\'```')

	@commands.command(description="Shows you all the guilds I'm in.")
	async def listguilds(self, ctx):
		"""Shows you all the guilds I'm in."""
		if isadmin(ctx) == True:
			guilds = self.bot.guilds
			guildlist = []
			separator = ",\n"
			for guild in guilds:
				guildlist.append(f"{guild.name}")
			await ctx.send(f"```{separator.join(guildlist)}```")
		else:
			await ctx.send("I can't send the list here due to character limits and me being lazy")

	@commands.command(name="speedtest", description="Runs a speedtest on my VPS")
	async def speedtest_(self, ctx):
		"""Runs a speedtest on my VPS"""
		msg = await ctx.send("<a:Load:546751645954998282> Running Speedtest")
		ctx.message.channel.typing()
		s = speedtest.Speedtest()
		s.get_best_server()
		s.download()
		s.upload()
		s.results.share()
		test = s.results.dict()
		url = test['share']
		embed = discord.Embed(color=ctx.author.color)
		embed.set_image(url=url)
		await msg.edit(embed=embed)

	@commands.command(description="dab")
	async def dab(self, ctx):
		"""<o/"""
		await ctx.send(f"{ctx.message.author.mention}, <o/")

	@commands.command(description="idk")
	async def warm(self, ctx, *, warm: str):
		"""warm something up. idk"""
		await ctx.send(f'🔥 Warming up {warm}')

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