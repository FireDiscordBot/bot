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
from discord.ext import commands, flags
import json
import re

print("conorthedev.py has been loaded")

class conor(commands.Cog, name="ConorTheDev's Custom Features"):
	def __init__(self, bot):
		self.bot = bot
		self.config = json.load(open('conor.json', 'r'))
		if not hasattr(self.bot, 'conorantiswear'):
			self.bot.conorantiswear = self.config.get('antiswear', True)
		self.swear = self.config.get('words', [])

	@commands.command(name='conorswear')
	async def stopswearingconor(self, ctx, state: bool = True):
		if ctx.author.id != 509078480655351820:
			return await ctx.send('no')
		self.bot.conorantiswear = state
		self.config['antiswear'] = state
		json.dump(self.config, open('conor.json', 'w'), indent=4)
		e = 'enabled' if self.bot.conorantiswear else 'disabled'
		return await ctx.send(f'Antiswear is now {e}')

	@commands.command(name='caddswear', aliases=['cswearadd'])
	async def addswear(self, ctx, word: str, f: flags.FlagParser(remove=bool) = flags.EmptyFlags):
		if ctx.author.id != 509078480655351820:
			return await ctx.send('no')
		remove = False
		if isinstance(f, dict):
			remove = f['remove']
		if not remove:
			self.config['words'].append(word)
			json.dump(self.config, open('conor.json', 'w'), indent=4)
			self.swear = self.config['words']
			return await ctx.send(f'Added {word} to the naughty list')
		elif word in self.swear:
			self.config['words'].remove(word)
			json.dump(self.config, open('conor.json', 'w'), indent=4)
			self.swear = self.config['words']
			return await ctx.send(f'Removed {word} from the naughty list')

	@commands.Cog.listener()
	async def on_message(self, message):
		if message.author.id != 509078480655351820:
			return
		tocheck = re.sub(r'[^A-Za-z0-9 ]', '', message.content, 0, re.MULTILINE)
		if any(swear in tocheck.lower().split(' ') for swear in self.swear) and self.bot.conorantiswear:
			try:
				await message.delete()
			except Exception:
				await message.author.send('Stop fucking swearing you cunt')


def setup(bot):
	bot.add_cog(conor(bot))
