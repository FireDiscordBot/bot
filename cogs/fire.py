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
import aiohttp
import subprocess
import random
from jishaku.paginators import PaginatorInterface, PaginatorEmbedInterface, WrappedPaginator

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
	async def suggest(self, ctx, *, suggestion: str):
		"""PFXsuggest <suggestion>"""
		if suggestion == None:
			await ctx.send("You can't suggest nothing!")
		else:
			await ctx.send("Thanks! Your suggestions help improve Fire.")
			me = self.bot.get_user(287698408855044097)
			await me.send(f"{ctx.message.author} suggested: {suggestion}")

	@commands.command(description="Shows you some stats about me.", aliases=['about'])
	async def stats(self, ctx):
		"""PFXstats"""
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
		embed.set_author(name="Bot made by Geek#9999", url="https://gaminggeek.club", icon_url="https://cdn.discordapp.com/avatars/287698408855044097/7d8707c0556bdbe5e29b2b0788de8ca9.png?size=1024")
		embed.add_field(name="**Runtime**", value=f"{uptime}", inline=False)
		embed.add_field(name="**OS**", value=f"{os}", inline=False)
		embed.add_field(name="**CPU**", value=f"{cpu} ({round(cpustats)}%)", inline=False)
		embed.add_field(name="**RAM**", value=f"{ramuse} MB / 6024 MB", inline=False)
		embed.add_field(name="**Version Info**", value=f"discord.py {discord.__version__} | Python: 3.7.2", inline=False)
		embed.add_field(name="**Guilds**", value=f"{len(self.bot.guilds)}", inline=True)
		embed.add_field(name="**Prefix**", value=f"{ctx.prefix}", inline=True)
		embed.add_field(name="**Commands**", value=len(self.bot.commands), inline=True)
		embed.add_field(name="**Members**", value=f"{self.bot.get_emoji(313956277808005120)} {online:,d}\n{self.bot.get_emoji(313956277220802560)} {idle:,d}\n{self.bot.get_emoji(313956276893646850)} {dnd:,d}\n{self.bot.get_emoji(313956277132853248)} {streaming:,d}\n{self.bot.get_emoji(313956277237710868)} {offline:,d}\nTotal: {users:,d}\n ", inline=False)
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
			paginator.add_line(f'[{gcount}] {guild.name}{current} || {guild.owner} || {guild.member_count} Members')
			#paginator.add_line(f'[{gcount}] {guild.name}{current} || Shard ID: {guild.shard_id} || {guild.owner} || {guild.member_count} Members')
			gcount = gcount + 1
		interface = PaginatorInterface(ctx.bot, paginator, owner=ctx.author)
		await interface.send_to(ctx)

	@commands.command(description="dab")
	async def dab(self, ctx):
		"""PFXdab"""
		await ctx.send(f"{ctx.message.author.mention}, <o/")

	@commands.command(description="idk")
	async def warm(self, ctx, *, warm: str):
		"""PFXwarm <item>"""
		await ctx.send(f'🔥 Warming up {warm}')

	@commands.command(description='Cow goes moo')
	async def cowsay(self, ctx, *, cow: str):
		"""PFXcowsay <text>"""
		async with aiohttp.ClientSession() as session:
			async with session.get(f'http://cowsay.morecode.org/say?message={cow}&format=json') as resp:
				body = await resp.json()
		cow = body['cow']
		await ctx.send(f'```{cow}```')

	@commands.command(description='ascii text')
	async def ascii(self, ctx, *, text: str):
		"""PFXascii <text>"""
		textsplit = text.split(' ')
		text = '+'.join(textsplit)
		async with aiohttp.ClientSession() as session:
			async with session.get(f'http://artii.herokuapp.com/make?text={text}') as resp:
				body = await resp.text()
		await ctx.send(f'```{body}```')

def setup(bot):
	bot.add_cog(fire(bot))