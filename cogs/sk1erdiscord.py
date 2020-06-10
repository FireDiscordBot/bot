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
		self.gist = 'b070e7f75a9083d2e211caffa0c772cc'
		self.gistheaders = {'Authorization': f'token {bot.config["github"]}'}
		self.modcoreheaders = {'secret': bot.config['modcore']}
		self.reupload = r'(?:http(?:s)?://)?(paste\.ee|pastebin\.com|hastebin\.com|hasteb\.in)/(?:raw/|p/)?(\w+)'
		self.noraw = r'(?:http(?:s)?://)?(?:justpaste)\.(?:it)/(\w+)'
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
			'[DefaultDispatcher-worker-1] ERROR Installer',
			'[Client thread/INFO]:'
		]
		self.secrets = r'(club\.sk1er\.mods\.levelhead\.auth\.MojangAuth|api\.sk1er\.club\/auth|LoginPacket|SentryAPI\.cpp|"authHash":|"hash":"|--accessToken|\(Session ID is token:|Logging in with details: |Server-Hash: |Checking license key :)'
		self.emailre = r'[a-zA-Z0-9_.+-]{1,50}@[a-zA-Z0-9-]{1,50}\.[a-zA-Z0-9-.]{1,10}'
		self.urlre = r'(?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)'
		self.homere = r'(/Users/\w+|/home/\w+|C:\\Users\\\w+)'
		self.solutions = json.load(open('sk1er_solutions.json'))
		self.description_updater.start()
		self.uuidcache = {}

	async def name_to_uuid(self, player: str):
		try:
			self.uuidcache[player]
		except KeyError:
			route = Route(
				'GET',
				f'/users/profiles/minecraft/{player}'
			)
			try:
				profile = await self.bot.http.mojang.request(route)
				if profile:
					self.uuidcache.update({player: profile['id']})
			except Exception:
				pass  # whatever is using this should check for None
		return self.uuidcache.get(player, None)

	@tasks.loop(minutes=5)
	async def description_updater(self):
		try:
			session = aiohttp.ClientSession()
			m = (await self.bot.http.sk1er.request(Route('GET', '/mods_analytics')))['combined_total']
			m += (await (await session.get('https://api.autotip.pro/counts')).json())['total']
			m += (await (await session.get('https://api.hyperium.cc/users')).json())['all']
			await session.close()
			await self.guild.edit(description=f'The Official Discord for Sk1er & Sk1er Mods ({m:,d} total players)')
		except Exception as e:
			pass

	def cog_unload(self):
		self.description_updater.cancel()

	async def cog_check(self, ctx: commands.Context):
		if ctx.guild.id == 411619823445999637:
			return True
		return False

	@commands.Cog.listener()
	async def on_command_error(self, ctx, error):
		if isinstance(error, commands.CheckFailure):
			if ctx.channel.id == 411620457754787841:
				await ctx.send(
					file=discord.File('command_general.png', filename='firebestbot.png')
				)

	@commands.Cog.listener()
	async def on_member_remove(self, member):
		if self.nitro in member.roles:
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
		if after.guild.id != self.guild.id:
			return
		if before.roles != after.roles:
			sk1roles = [
				discord.utils.get(self.guild.roles, id=585534346551754755),
				discord.utils.get(self.guild.roles, id=436306157762773013),
				discord.utils.get(self.guild.roles, id=698943379181928520)
			]
			if not any(r for r in sk1roles if r in after.roles):
				if not self.bot.isascii(after.nick or after.name) or self.bot.ishoisted(after.nick or after.name):
					await after.edit(nick=self.bot.get_config(self.guild.id).get('utils.badname') or f'John Doe {after.discriminator}')
			broles = []
			aroles = []
			changed = []
			for role in before.roles:
				broles.append(role)
			for role in after.roles:
				aroles.append(role)
			s = set(aroles)
			removed = [x for x in broles if x not in s]
			if self.nitro in removed:
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

	def get_solutions(self, log):
		solutions = []
		for err, sol in self.solutions.items():
			if err in log:
				solutions.append(f'- {sol}')
		if all(m in log for m in ['com.replaymod', 'io.framesplus']):
			solutions.append(f'- Frames+ and Replaymod are incompatible. You will need to remove one of them')
		if not solutions:
			return ''
		return 'Possible solutions:\n' + '\n'.join(solutions)

	@commands.Cog.listener()
	async def on_message(self, message):
		if self.bot.dev:
			return
		if not message.guild or message.guild.id != 411619823445999637:
			return
		noraw = re.findall(self.noraw, message.content, re.MULTILINE)
		if noraw:
			try:
				await message.delete()
			except discord.HTTPException:
				pass
			return await message.channel.send(f'{message.author.mention} I am unable to read your log to remove sensitive information & provide solutions to your issue. Please upload the log directly :)')
		reupload = re.findall(self.reupload, message.content, re.MULTILINE)
		for domain, key in reupload:
			try:
				async with aiohttp.ClientSession().get(f'https://{domain}/{"r" if "paste.ee" in domain else "raw"}/{key}') as r:
					message.content = re.sub(self.reupload, (await r.text()), message.content, 0, re.MULTILINE)
			except Exception:
				return await message.channel.send(f'I was unable to read your log. Please upload it directly rather than using {domain}')
		for attach in message.attachments:
			if not any(attach.filename.endswith(ext) for ext in ['.log', '.txt']):
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
					url = await self.bot.haste(txt)
				except Exception as e:
					self.bot.logger.error(f'$REDFailed to upload log to hastebin', exc_info=e)
					return
				try:
					await message.delete()
				except discord.HTTPException:
					pass
				solutions = self.get_solutions(txt)
				return await message.channel.send(f'{message.author} uploaded a log, {message.content}\n{url}\n\n{solutions}')
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
					url = await self.bot.haste(txt)
				except Exception as e:
					self.bot.logger.error(f'$REDFailed to upload log to hastebin', exc_info=e)
					return
				try:
					await message.delete()
				except discord.HTTPException:
					pass
				solutions = self.get_solutions(txt)
				return await message.channel.send(f'{message.author} sent a log, {url}\n\n{solutions}')

	@commands.command(description='Adds perks for Nitro Boosters')
	async def nitroperks(self, ctx, ign: str = None):
		if self.nitro not in ctx.author.roles:
			return await ctx.send('no')
		if not ign:
			return await ctx.error('You must provide your Minecraft name!')
		mid = await self.name_to_uuid(ign)
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
			user['uuid'] = str(uuid.UUID(mid))
			user['ign'] = ign
		except Exception:
			user = {
				"uuid": str(uuid.UUID(mid)),
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
			self.bot.logger.warn(f'$YELLOWFailed to give perks on modcore', exc_info=e)
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
			return await ctx.error('Failed to give you the perks in Hyperium')
		return await progress.edit(content='<:check:674359197378281472> Successfully gave you the perks!')


def setup(bot):
	bot.add_cog(Sk1er(bot))
	bot.logger.info(f'$GREENLoaded cog for discord.gg/sk1er!')
