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

import discord
from discord.ext import commands
from fire.converters import TextChannel
import asyncio


class configuration(commands.Cog, name="Configuration"):
	def __init__(self, bot):
		self.bot = bot
		self.configs = ['log']

	@commands.group(name='config')
	async def config(self, ctx):
		if ctx.invoked_subcommand:
			return
		# list available config options

	@config.group(name='log', aliases=['logging', 'logger'])
	async def log(self, ctx):
		if ctx.invoked_subcommand:
			return
		# list available config options

	@log.command(name='modlogs')
	async def modlogs(self, ctx, channel: TextChannel = None):
		if not channel:
			channel = 0
		con = await self.bot.db.acquire()
		async with con.transaction():
			q = 'UPDATE settings SET modlogs = $1 WHERE gid = $2;'
			await self.bot.db.execute(q, channel, ctx.guild.id)
		await self.bot.db.release(con)
		return await ctx.success(f'Successfully enabled moderation logs in {channel.mention}')

	@log.command(name='actionlogs')
	async def actionlogs(self, ctx, channel: TextChannel = None):
		if not channel:
			channel = 0
		con = await self.bot.db.acquire()
		async with con.transaction():
			q = 'UPDATE settings SET actionlogs = $1 WHERE gid = $2;'
			await self.bot.db.execute(q, channel, ctx.guild.id)
		await self.bot.db.release(con)
		return await ctx.success(f'Successfully enabled action logs in {channel.mention}')


def setup(bot):
	bot.add_cog(configuration(bot))
	bot.logger.info(f'$GREENLoaded Config cog!')
