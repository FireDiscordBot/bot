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

from discord.ext import commands, tasks
from fire.http import Route
import datetime
import aiohttp
import discord
import json
import uuid
import re


class Sk1er(commands.Cog, name='Sk1er Discord'):
	def __init__(self, bot):
		self.bot = bot
		self.guild = self.bot.get_guild(411619823445999637)
		self.nitro = discord.utils.get(self.guild.roles, id=585534346551754755)
		self.testrole = discord.utils.get(self.guild.roles, id=645067429067751436)
		self.gist = 'b070e7f75a9083d2e211caffa0c772cc'
		self.gistheaders = {'Authorization': f'token {bot.config["github"]}'}
		self.modcoreheaders = {'secret': bot.config['modcore']}
		self.pastebinre = r'https://pastebin\.com/([^raw]\w+)'
		self.logregex = r'((hyperium-)?crash-\d{4}-\d{2}-\d{2}_\d{2}\.\d{2}\.\d{2}.+\.txt|latest\.log|launcher_log\.txt|hs_err_pid\d{1,8}\.log)'
		self.logtext = [
			'net.minecraft.launchwrapper.Launch',
			'# A fatal error has been detected by the Java Runtime Environment:',
			'---- Minecraft Crash Report ----',
			'A detailed walkthrough of the error',
			'launchermeta.mojang.com',
			'Running launcher core',
			'Native Launcher Version:',
			'[Client thread/INFO]: Setting user:',
			'[Client thread/INFO]: (Session ID is',
			'MojangTricksIntelDriversForPerformance',
			'[DefaultDispatcher-worker-1] INFO Installer',
			'[DefaultDispatcher-worker-1] ERROR Installer'
		]
		self.secrets = r'(club\.sk1er\.mods\.levelhead\.auth\.MojangAuth|api\.sk1er\.club\/auth|LoginPacket|SentryAPI\.cpp|"authHash":|"hash":"|--accessToken|\(Session ID is token:|Logging in with details: |Server-Hash: |Checking license key :)'
		self.emailre = r'[a-zA-Z0-9_.+-]{1,50}@[a-zA-Z0-9-]{1,50}\.[a-zA-Z0-9-.]{1,10}'
		self.urlre = r'(?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)'
		self.homere = r'(/Users/\w+|/home/\w+|C:\\Users\\\w+)'
		self.description_updater.start()

	@tasks.loop(minutes=5)
	async def description_updater(self):
		try:
			m = (await self.bot.http.sk1er.request(Route('GET', '/mods_analytics')))['combined_total']
			m += (await (await aiohttp.ClientSession().get('https://api.autotip.pro/counts')).json())['total']
			m += (await (await aiohttp.ClientSession().get('https://api.hyperium.cc/users')).json())['all']
			await self.guild.edit(description=f'The Official Discord for Sk1er & Sk1er Mods ({m:,d} total players)')
		except Exception as e:
			self.bot.logger.warn(f'Description update task for {self.guild} failed.', exc_info=e)

	def cog_unload(self):
		self.description_updater.cancel()

	async def cog_check(self, ctx: commands.Context):
		if ctx.guild.id == 411619823445999637:
			return True
		return False

	@commands.Cog.listener()
	async def on_member_remove(self, member):
		if self.nitro in member.roles or self.testrole in member.roles:
			route = Route(
				'GET',
				f'/gists/{self.gist}'
			)
			try:
				gist = await self.bot.http.github.request(route, headers=self.gistheaders)
			except Exception:
				self.bot.logger.error(f'$REDFailed to fetch booster gist for $CYAN{member}')
				return
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
			route = Route(
				'GET',
				f'/nitro/{mcuuid}/false'
			)
			try:
				await self.bot.http.modcore.request(route, headers=self.modcoreheaders)
			except Exception as e:
				self.bot.logger.error(f'$REDFailed to remove nitro perks for $CYAN{mcuuid}')
			route = Route(
				'PATCH',
				f'/gists/{self.gist}'
			)
			try:
				gist = await self.bot.http.github.request(
					route,
					json=payload,
					headers=self.gistheaders
				)
			except Exception:
				self.bot.logger.error(f'$REDFailed to patch booster gist for $CYAN{mcuuid}')
				return
			general = self.guild.get_channel(411620457754787841)
			await general.send(f'{member} left and their nitro perks have been removed.')

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
				route = Route(
					'GET',
					f'/gists/{self.gist}'
				)
				try:
					gist = await self.bot.http.github.request(
						route,
						headers=self.gistheaders
					)
				except Exception:
					self.bot.logger.error(f'$REDFailed to get booster gist for $CYAN{after}')
					return
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
				route = Route(
					'GET',
					f'/nitro/{mcuuid}/false'
				)
				try:
					await self.bot.http.modcore.request(route, headers=self.modcoreheaders)
				except Exception as e:
					self.bot.logger.error(f'$REDFailed to remove modcore nitro perks for $CYAN{mcuuid}')
				payload = {
					'description': 'Nitro Booster dots for the Hyperium Client!',
					'files': {
						'boosters.json': {
							'content': json.dumps(current, indent=2)
						}
					}
				}
				route = Route(
					'PATCH',
					f'/gists/{self.gist}'
				)
				try:
					gist = await self.bot.http.github.request(
						route,
						json=payload,
						headers=self.gistheaders
					)
				except Exception:
					self.bot.logger.error(f'$REDFailed to patch booster gist for $CYAN{mcuuid}')
					return
				general = self.guild.get_channel(411620457754787841)
				await general.send(f'{after.mention} Your nitro perks have been removed. Boost the server to get them back :)')

	async def haste(self, content, fallback: bool=False):
		url = 'hst.sh'
		if fallback:
			url = 'h.inv.wtf'
		async with aiohttp.ClientSession().post(f'https://{url}/documents', data=content) as r:
			if r.status != 200 and not fallback:
				return await self.haste(content, fallback=True)
			j = await r.json()
			return f'<https://{url}/' + j['key'] + '>'

	@commands.Cog.listener()
	async def on_message(self, message):
		if self.bot.dev:
			return
		pastebin = re.findall(self.pastebinre, message.content, re.MULTILINE)
		for p in pastebin:
			async with aiohttp.ClientSession().get(f'https://pastebin.com/raw/{p}') as r:
				message.content = re.sub(self.pastebinre, (await r.text()), message.content, 0, re.MULTILINE)
		for attach in message.attachments:
			if not re.match(self.logregex, attach.filename) and not attach.filename == 'message.txt':
				return
			try:
				txt = await attach.read()
			except Exception as e:
				self.bot.logger.error(f'$REDFailed to read log sent by $CYAN{message.author}', exc_info=e)
			try:
				txt = txt.decode('utf-8')
			except Exception:
				try:
					txt = txt.decode('ISO-8859-1')
				except Exception as e:
					self.bot.logger.error(f'$REDFailed to decode log sent by $CYAN{message.author}', exc_info=e)
					return # give up, leave the file there
			txt = re.sub(self.emailre, '[removed email]', txt, 0, re.MULTILINE)
			txt = re.sub(self.urlre, '[removed url]', txt, 0, re.MULTILINE)
			txt = re.sub(self.homere, 'USER.HOME', txt, 0, re.MULTILINE)
			for line in txt.split('\n'):
				if re.findall(self.secrets, line, re.MULTILINE):
					txt = txt.replace(line, '[line removed to protect sensitive info]')
			if any(t in txt for t in self.logtext) and message.guild.id == 411619823445999637:
				try:
					url = await self.haste(txt)
				except Exception as e:
					self.bot.logger.error(f'$REDFailed to upload log to hastebin', exc_info=e)
					return
				await message.delete()
				return await message.channel.send(f'{message.author} uploaded a log, {message.content}\n{url}')
		if not message.attachments and len(message.content) > 350:
			txt = message.content
			txt = re.sub(self.emailre, '[removed email]', txt, 0, re.MULTILINE)
			txt = re.sub(self.urlre, '[removed url]', txt, 0, re.MULTILINE)
			txt = re.sub(self.homere, 'USER.HOME', txt, 0, re.MULTILINE)
			for line in txt.split('\n'):
				if re.findall(self.secrets, line, re.MULTILINE):
					txt = txt.replace(line, '[line removed to protect sensitive info]')
			if any(t in message.content for t in self.logtext) and message.guild.id == 411619823445999637:
				try:
					url = await self.haste(txt)
				except Exception as e:
					self.bot.logger.error(f'$REDFailed to upload log to hastebin', exc_info=e)
					return
				await message.delete()
				return await message.channel.send(f'{message.author} sent a log, {url}')

	@commands.command(description='Adds perks for Nitro Boosters')
	async def nitroperks(self, ctx, ign: str = None):
		if self.nitro not in ctx.author.roles and self.testrole not in ctx.author.roles:
			return await ctx.send('no')
		if not ign:
			return await ctx.error('You must provide your Minecraft name!')
		mid = await self.bot.get_cog('Hypixel Commands').name_to_uuid(ign)
		if not mid:
			return await ctx.error('No UUID found!')
		progress = await ctx.send('Give me a moment.')
		route = Route(
			'GET',
			f'/gists/{self.gist}'
		)
		try:
			gist = await self.bot.http.github.request(
				route,
				headers=self.gistheaders
			)
		except Exception:
			return await progress.edit(content='<:xmark:674359427830382603> Something went wrong when getting the list of boosters')
		text = gist.get('files', {}).get('boosters.json', {}).get('content', ['error'])
		current = json.loads(text)
		if 'error' in current:
			return await progress.edit(content='<:xmark:674359427830382603> Something went wrong when getting the list of boosters')
		try:
			user = next(i for i in current if i["id"] == str(ctx.author.id))
			route = Route(
				'GET',
				f'/nitro/{user["uuid"]}/false'
			)
			try:
				await self.bot.http.modcore.request(route, headers=self.modcoreheaders)
			except Exception as e:
				return await progress.edit(f'<:xmark:674359427830382603> Failed to remove perks from previous user, {user["ign"]}')
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
		route = Route(
			'GET',
			f'/nitro/{user["uuid"]}/true'
		)
		try:
			await self.bot.http.modcore.request(route, headers=self.modcoreheaders)
		except Exception as e:
			await ctx.error(f'Failed to give perks on modcore.')
		payload = {
			'description': 'Nitro Booster dots for the Hyperium Client!',
			'files': {
				'boosters.json': {
					'content': json.dumps(current, indent=2)
				}
			}
		}
		route = Route(
			'PATCH',
			f'/gists/{self.gist}'
		)
		try:
			gist = await self.bot.http.github.request(
				route,
				json=payload,
				headers=self.gistheaders
			)
		except Exception:
			return await ctx.error(content='<:xmark:674359427830382603> Failed to give you the perks in Hyperium')
		return await progress.edit(content='<:check:674359197378281472> Successfully gave you the perks!')


def setup(bot):
	bot.add_cog(Sk1er(bot))
	bot.logger.info(f'$GREENLoaded cog for discord.gg/sk1er!')
