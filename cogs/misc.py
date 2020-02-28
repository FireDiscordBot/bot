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
import asyncio


class misc(commands.Cog, name="Miscellaneous"):
	def __init__(self, bot):
		self.bot = bot
		if not hasattr(bot, 'plonked'):
			self.bot.plonked = []
		asyncio.get_event_loop().create_task(self.loadutils())

	async def loadutils(self):
		await self.bot.wait_until_ready()
		self.bot.plonked = await self.loadplonked()
		self.bot.logger.info(f'$GREENLoaded blacklist!')

	async def loadplonked(self):
		plonked = []
		query = 'SELECT * FROM blacklist;'
		plonk = await self.bot.db.fetch(query)
		for p in plonk:
			plonked.append(p['uid'])
		return plonked

def setup(bot):
	bot.add_cog(misc(bot))
	bot.logger.info(f'$GREENLoaded Misc cog!')
