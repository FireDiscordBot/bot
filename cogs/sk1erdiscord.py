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
import datetime
import aiohttp
import json
import uuid
import re


with open('config.json', 'r') as cfg:
	config = json.load(cfg)


class sk1ercog(commands.Cog, name="Sk1er's Epic Cog"):
	def __init__(self, bot):
		self.bot = bot
		self.guild = self.bot.get_guild(411619823445999637)
		self.nitro = discord.utils.get(self.guild.roles, id=585534346551754755)
		self.testrole = discord.utils.get(self.guild.roles, id=645067429067751436)
		self.gist = 'b070e7f75a9083d2e211caffa0c772cc'
		self.gistheaders = {'Authorization': f'token {config["github"]}'}
		self.modcoreheaders = {'secret': config['modcore']}
		self.logregex = r'((hyperium-)?crash-\d{4}-\d{2}-\d{2}_\d{2}\.\d{2}\.\d{2}.+\.txt|latest\.log|launcher_log\.txt|hs_err_pid\d{1,8}\.log)'
		self.logtext = [
			'net.minecraft.launchwrapper.Launch',
			'# A fatal error has been detected by the Java Runtime Environment:',
			'---- Minecraft Crash Report ----',
			'A detailed walkthrough of the error',
			'launchermeta.mojang.com',
			'Running launcher core',
			'[Client thread/INFO]: Setting user:',
			'[Client thread/INFO]: (Session ID is'
		]
		self.secrets = r'(club\.sk1er\.mods\.levelhead\.auth\.MojangAuth|api\.sk1er\.club\/auth|LoginPacket|SentryAPI\.cpp|"authHash":|"hash":"|--accessToken|\(Session ID is token:|Logging in with details: |Server-Hash: |Checking license key :)'

	async def cog_check(self, ctx: commands.Context):
		if ctx.guild.id == 411619823445999637:
			return True
		return False

	@commands.Cog.listener()
	async def on_member_remove(self, member):
		if self.nitro in member.roles or self.testrole in member.roles:
			async with aiohttp.ClientSession(headers=self.gistheaders) as s:
				async with s.get(f'https://api.github.com/gists/{self.gist}') as r:
					if r.status != 200:
						return
					gist = await r.json()
					text = gist.get('files', {}).get('boosters.json', {}).get('content', ['error'])
					current = json.loads(text)
			if 'error' in current:
				return
			try:
				user = next(i for i in current if i["id"] == str(member.id))
				mcuuid = user['uuid']
				current.remove(user)
			except Exception:
				return
			payload = {
				'description': 'Nitro Booster dots for the Hyperium Client!',
				'files': {
					'boosters.json': {
						'content': json.dumps(current, indent=2)
					}
				}
			}
			await aiohttp.ClientSession(headers=self.modcoreheaders).get(f'{config["modcoreapi"]}nitro/{mcuuid}/false')
			async with aiohttp.ClientSession(headers=self.gistheaders) as s:
				async with s.patch(f'https://api.github.com/gists/{self.gist}', json=payload) as r:
					if r.status == 200:
						general = self.guild.get_channel(411620457754787841)
						await general.send(f'{member} left and their nitro perks in Hyperium & Modcore have been removed.')

	@commands.Cog.listener()
	async def on_member_update(self, before, after):
		if self.testrole in after.roles and after.id != 287698408855044097:
			await after.remove_roles(self.testrole, reason='not geek')
		if before.roles != after.roles:
			broles = []
			aroles = []
			changed = []
			for role in before.roles:
				broles.append(role)
			for role in after.roles:
				aroles.append(role)
			s = set(aroles)
			removed = [x for x in broles if x not in s]
			if self.nitro in removed or (self.testrole in removed and after.id == 287698408855044097):
				if not self.bot.isascii(after.nick or after.name) or self.bot.ishoisted(after.nick or after.name):
					await after.edit(nick=f'John Doe {after.discriminator}')
				async with aiohttp.ClientSession(headers=self.gistheaders) as s:
					async with s.get(f'https://api.github.com/gists/{self.gist}') as r:
						if r.status != 200:
							return
						gist = await r.json()
						text = gist.get('files', {}).get('boosters.json', {}).get('content', ['error'])
						current = json.loads(text)
				if 'error' in current:
					return
				try:
					user = next(i for i in current if i["id"] == str(after.id))
					mcuuid = user['uuid']
					current.remove(user)
				except Exception:
					return
				payload = {
					'description': 'Nitro Booster dots for the Hyperium Client!',
					'files': {
						'boosters.json': {
							'content': json.dumps(current, indent=2)
						}
					}
				}
				await aiohttp.ClientSession(headers=self.modcoreheaders).get(f'{config["modcoreapi"]}nitro/{mcuuid}/false')
				async with aiohttp.ClientSession(headers=self.gistheaders) as s:
					async with s.patch(f'https://api.github.com/gists/{self.gist}', json=payload) as r:
						if r.status == 200:
							general = self.guild.get_channel(411620457754787841)
							await general.send(f'{after.mention} Your nitro perks in Hyperium & Modcore have been removed. Boost the server to get them back :)')

	async def haste(self, content):
		async with aiohttp.ClientSession().post('https://hasteb.in/documents', data=content) as r:
			j = await r.json()
			return '<https://hasteb.in/' + j['key'] + '>'

	def is_allowed_log(self, channel):
		if channel.id in [412310617442091008, 429311217862180867, 595625113282412564, 637022496750567433]:
			return True
		if channel.category and channel.category.id == 431239172179623947:
			return True
		return False

	@commands.Cog.listener()
	async def on_message(self, message):
		if self.bot.dev:
			return
		for attach in message.attachments:
			if not re.match(self.logregex, attach.filename) and not attach.filename == 'message.txt':
				return
			txt = await attach.read()
			try:
				txt = txt.decode('utf-8')
			except Exception:
				try:
					txt = txt.decode('ISO-8859-1')
				except Exception:
					return # give up, leave the file there
			for line in txt.split('\n'):
				if re.findall(self.secrets, line, re.MULTILINE):
					txt = txt.replace(line, '[line removed to protect sensitive info]')
			if any(t in txt for t in self.logtext):
				if self.is_allowed_log(message.channel):
					try:
						url = await self.haste(txt)
					except Exception as e:
						self.bot.logger.error(f'$REDFailed to upload log to hastebin', exc_info=e)
						return
					await message.delete()
					return await message.channel.send(f'{message.author} uploaded a log, {message.content}\n{url}')
				elif message.guild.id == 411619823445999637:
					await message.delete()
					return await message.channel.send(f'{message.author.mention}, please send logs/crash-reports in <#412310617442091008>.')
		if not message.attachments:
			txt = message.content
			for line in txt.split('\n'):
				if re.findall(self.secrets, line, re.MULTILINE):
					txt = txt.replace(line, '[line removed to protect sensitive info]')
			if any(t in message.content for t in self.logtext):
				if self.is_allowed_log(message.channel):
					try:
						url = await self.haste(txt)
					except Exception as e:
						self.bot.logger.error(f'$REDFailed to upload log to hastebin', exc_info=e)
						return
					await message.delete()
					return await message.channel.send(url)
				elif message.guild.id == 411619823445999637:
					await message.delete()
					return await message.channel.send(f'{message.author.mention}, please only send logs/crash-reports in <#412310617442091008>.')

	async def nameToUUID(self, player: str):
		async with aiohttp.ClientSession() as s:
			async with s.get(f'https://api.mojang.com/users/profiles/minecraft/{player}') as r:
				if r.status == 204:
					return False
				elif r.status == 200:
					json = await r.json()
					mid = json['id']
					return str(uuid.UUID(mid))
		return False

	@commands.command(description='Adds perks for Nitro Boosters')
	async def nitroperks(self, ctx, ign: str = None):
		if self.nitro not in ctx.author.roles and self.testrole not in ctx.author.roles:
			return await ctx.send('no')
		if not ign:
			return await ctx.error('You must provide your Minecraft name!')
		mid = await self.nameToUUID(ign)
		if not mid:
			return await ctx.error('No UUID found!')
		progress = await ctx.send('Give me a moment.')
		async with aiohttp.ClientSession(headers=self.gistheaders) as s:
			async with s.get(f'https://api.github.com/gists/{self.gist}') as r:
				if r.status != 200:
					return await progress.edit(content='<:xmark:674359427830382603> Something went wrong when getting the list of boosters')
				gist = await r.json()
				text = gist.get('files', {}).get('boosters.json', {}).get('content', ['error'])
				current = json.loads(text)
		if 'error' in current:
			return await progress.edit(content='<:xmark:674359427830382603> Something went wrong when getting the list of boosters')
		try:
			user = next(i for i in current if i["id"] == str(ctx.author.id))
			async with aiohttp.ClientSession(headers=self.modcoreheaders) as s:
				async with s.get(f'{config["modcoreapi"]}nitro/{user["uuid"]}/false') as r:
					if r.status != 200:
						await progress.edit(content='<:xmark:674359427830382603> Modcore didn\'t respond correctly')
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
		async with aiohttp.ClientSession(headers=self.modcoreheaders) as s:
			async with s.get(f'{config["modcoreapi"]}nitro/{user["uuid"]}/true') as r:
				if r.status != 200:
					await ctx.error('Modcore didn\'t respond correctly')
		async with aiohttp.ClientSession(headers=self.gistheaders) as s:
			async with s.patch(f'https://api.github.com/gists/{self.gist}', json=payload) as r:
				if r.status == 200:
					if ctx.author.id == 202666531111436288:
						return await ctx.success('Successfully gave you the perks!')
					return await progress.edit(content='<:check:674359197378281472> Successfully gave you the perks!')
				else:
					return await progress.edit(content='<:xmark:674359427830382603> Something went wrong when updating the list')


def setup(bot):
	bot.add_cog(sk1ercog(bot))
	bot.logger.info(f'$GREENLoaded cog for discord.gg/sk1er!')
