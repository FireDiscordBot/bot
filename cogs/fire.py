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
from fire.extras import has_override
from discord.ext import commands
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


def getconfig(path: str = None):
	with open('config.json', 'r') as cfg:
		config = json.load(cfg)
	if path != None:
		return config[path]
	else:
		return config

config = getconfig()

class firecog(commands.Cog, name="Main Commands"):  # this cog will soon be gone
	def __init__(self, bot):
		self.bot = bot
		self._last_result = None

	def cleanup_code(self, content):
		if content.startswith('```') and content.endswith('```'):
			return '\n'.join(content.split('\n')[1:-1])

		return content.strip('` \n')

	@commands.command(description="Shows you some stats about me.", aliases=['about'])
	async def stats(self, ctx):
		msg = await ctx.send('Gathering info...')
		delta_uptime = datetime.datetime.utcnow() - self.bot.launchtime
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
				online += 1
			if str(member.status) == 'idle':
				idle += 1
			if str(member.status) == 'dnd':
				dnd += 1
			if str(member.status) == 'offline':
				offline += 1
			try:
				for a in member.activities:
					if isinstance(a, discord.Streaming):
						streaming += 1
			except Exception:
				pass
		users = len(members)  # thanks cube lmao
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
		if not self.bot.isadmin(ctx.author):
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

	@commands.command(name='cool')
	@has_override(build='7580df790d964bf3a3539476d6314dcd')
	async def cool(self, ctx):
		return await ctx.success('you are cool')

def setup(bot):
	bot.add_cog(firecog(bot))
	bot.logger.info(f'$GREENLoaded Main cog!')
