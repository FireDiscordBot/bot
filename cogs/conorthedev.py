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

print("conorthedev.py has been loaded")

class conor(commands.Cog, name="ConorTheDev's Custom Features"):
	def __init__(self, bot):
		self.bot = bot
		if not hasattr(self.bot, 'conorantiswear'):
			self.bot.conorantiswear = True
		self.swear = ['fuck', 'shit', 'bollocks', 'cunt', 'retard', 'cum']

	@commands.command(name='conorswear')
	async def stopswearingconor(self, ctx, state: bool = True):
		if ctx.author.id != 509078480655351820:
			return await ctx.send('no')
		self.bot.conorantiswear = state
		e = 'enabled' if self.bot.conorantiswear else 'disabled'
		return await ctx.send(f'Antiswear is now {e}')

	@commands.Cog.listener()
	async def on_message(self, message):
		if message.author.id != 509078480655351820:
			return
		if any(swear in message.content.lower() for swear in self.swear) and self.bot.conorantiswear:
			try:
				await message.delete()
			except Exception:
				await message.author.send('Stop fucking swearing you cunt')
		

def setup(bot):
	bot.add_cog(conor(bot))
