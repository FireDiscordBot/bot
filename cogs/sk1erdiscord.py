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
import aiohttp
import json
import uuid

print("sk1erdiscord.py has been loaded")

with open('config.json', 'r') as cfg:
	config = json.load(cfg)

class sk1ercog(commands.Cog, name="Sk1er's Epic Cog"):
	def __init__(self, bot):
		self.bot = bot
		self.guild = self.bot.get_guild(411619823445999637)
		self.nitro = discord.utils.get(self.guild.roles, id=585534346551754755)
		self.staffteam = discord.utils.get(self.guild.roles, id=411817645436960768)
		self.gist = 'b070e7f75a9083d2e211caffa0c772cc'
		self.headers = {'Authorization': f'token {config["github"]}'}

	async def cog_check(self, ctx: commands.Context):
		if ctx.guild.id == 411619823445999637:
			return True
		return False

	@commands.Cog.listener()
	async def on_member_update(self, before, after):
		if before.roles != after.roles:
			broles = []
			aroles = []
			changed = []
			for role in before.roles:
				broles.append(role.name)
			for role in after.roles:
				aroles.append(role.name)
			s = set(aroles)
			removed = [x for x in broles if x not in s]
			test = discord.utils.get(self.guild.roles, id=645029907977601034)
			if test in removed:
				print(test.mention)
			if self.nitro in removed or test in removed:
				print('removing dot')
				async with aiohttp.ClientSession(headers=self.headers) as session:
					async with session.get(f'https://api.github.com/gists/{self.gist}') as resp:
						if resp.status != 200:
							print('gist status: ' + str(resp.status))
							return
						gist = await resp.json()
						text = gist.get('files', {}).get('boosters.json', {}).get('content', ['error'])
						current = json.loads(text)
				if 'error' in current:
					return
				try:
					user = next(i for i in current if i["id"] == str(after.id))
					current.remove(user)
				except Exception:
					print('user not found in current')
					return
				payload = {
					'description': 'Nitro Booster dots for the Hyperium Client!',
					'files': {
						'boosters.json': {
							'content': json.dumps(current, indent=2)
						}
					}
				}
				async with aiohttp.ClientSession(headers=self.headers) as session:
					async with session.patch(f'https://api.github.com/gists/{self.gist}', data=payload) as resp:
						print('edit status: ' + str(resp.status))
						if resp.status == 200:
							general = self.guild.get_channel(411620457754787841)
							await general.send(f'{after.mention} Your custom dot in Hyperium has been removed. Boost the server to get it back :)')
				

	async def nameToUUID(self, player: str):
		async with aiohttp.ClientSession() as session:
			async with session.get(f'https://api.mojang.com/users/profiles/minecraft/{player}') as resp:
				if resp.status == 204:
					return False
				elif resp.status == 200:
					json = await resp.json()
					mid = json['id']
					return str(uuid.UUID(mid))
		return False

	@commands.command(description='Makes a PR to add a pink dot for nitro boosters')
	async def nitrodot(self, ctx, ign: str = None):
		if self.nitro not in ctx.author.roles and self.staffteam not in ctx.author.roles:
			return await ctx.send('no')
		if not ign:
			return await ctx.send('<a:fireFailed:603214400748257302> You must provide your Minecraft name!')
		mid = 	await self.nameToUUID(ign)
		if not mid:
			return await ctx.send('<a:fireFailed:603214400748257302> No UUID found!')
		async with aiohttp.ClientSession(headers=self.headers) as session:
			async with session.get(f'https://api.github.com/gists/{self.gist}') as resp:
				if resp.status != 200:
					return await ctx.send('<a:fireFailed:603214400748257302> Something went wrong')
				gist = await resp.json()
				text = gist.get('files', {}).get('boosters.json', {}).get('content', ['error'])
				current = json.loads(text)
		if 'error' in current:
			return await ctx.send('<a:fireFailed:603214400748257302> Something went wrong')
		try:
			user = next(i for i in current if i["id"] == str(ctx.author.id))
			current.remove(user)
			user['uuid'] = mid
			user['ign'] = ign
		except Exception:
			user = {
				"uuid": mid,
				"ign": ign,
				"id": str(ctx.author.id),
				"color": "LIGHT_PURPLE"
			}
		current.append(user)
		payload = {
			'description': 'Nitro Booster dots for the Hyperium Client!',
			'files': {
				'boosters.json': {
					'content': json.dumps(current, indent=2)
				}
			}
		}
		async with aiohttp.ClientSession(headers=self.headers) as session:
			async with session.patch(f'https://api.github.com/gists/{self.gist}', json=payload) as resp:
				if resp.status == 200:
					return await ctx.send('<a:fireSuccess:603214443442077708> Successfully gave you a dot!')
				else:
					return await ctx.send('<a:fireFailed:603214400748257302> Something went wrong')
	


def setup(bot):
	bot.add_cog(sk1ercog(bot))