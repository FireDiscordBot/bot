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

from jishaku.paginators import WrappedPaginator, PaginatorEmbedInterface
from fire.http import HTTPClient, Route
from discord.ext import commands
from io import BytesIO
from PIL import Image
from . import mcfont
import datetime
import aiohttp
import discord
import hypixel
import json
import os
import re


remcolor = r'\u00A7[0-9A-FK-OR]'
uuidToName = {}
picklegames = {
	'QUAKECRAFT': 'Quake',
	'WALLS': 'Walls',
	'PAINTBALL': 'Paintball',
	'SURVIVAL_GAMES': 'Blitz SG',
	'TNTGAMES': 'TNT Games',
	'VAMPIREZ': 'VampireZ',
	'WALLS3': 'Mega Walls',
	'ARCADE': 'Arcade',
	'ARENA': 'Arena',
	'UHC': 'UHC Champions',
	'MCGO': 'Cops and Crims',
	'BATTLEGROUND': 'Warlords',
	'SUPER_SMASH': 'Smash Heroes',
	'GINGERBREAD': 'Turbo Kart Racers',
	'HOUSING': 'Housing',
	'SKYWARS': 'SkyWars',
	'TRUE_COMBAT': 'Crazy Walls',
	'SPEED_UHC': 'Speed UHC',
	'SKYCLASH': 'SkyClash',
	'LEGACY': 'Classic Games',
	'PROTOTYPE': 'Prototype',
	'BEDWARS': 'Bed Wars',
	'MURDER_MYSTERY': 'Murder Mystery',
	'BUILD_BATTLE': 'Build Battle',
	'DUELS': 'Duels'
}

class Hypixel(commands.Cog, name="Hypixel Commands"):
	def __init__(self, bot):
		self.bot = bot
		keys = bot.config['hypixel']
		hypixel.setKeys(keys)
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

	@commands.command(description="Get hypixel stats")
	async def hypixel(self, ctx, arg1: str = None, arg2: str = None):
		if arg1 is None:
			return await ctx.send("I need an IGN or `watchdog`", delete_after=5)
		arg1 = arg1.lower().replace('-', '')
		if arg2:
			arg2 = arg2.lower()
		if arg1.lower() == "watchdog":
			route = Route(
				'GET',
				'/watchdogstats'
			)
			watchdog = await self.bot.http.hypixel.request(route)
			color = ctx.author.color
			embed = discord.Embed(title="Watchdog Stats", colour=color, timestamp=datetime.datetime.now(datetime.timezone.utc))
			embed.set_thumbnail(url="https://hypixel.net/attachments/cerbtrimmed-png.245674/")
			embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
			embed.add_field(name="Watchdog Bans in the last minute", value=watchdog['watchdog_lastMinute'], inline=False)
			embed.add_field(name="Staff bans in the last day", value=format(watchdog['staff_rollingDaily'], ',d'), inline=False)
			embed.add_field(name="Watchdog bans in the last day", value=format(watchdog['watchdog_rollingDaily'], ',d'), inline=False)
			embed.add_field(name="Staff Total Bans", value=format(watchdog['staff_total'], ',d'), inline=False)
			embed.add_field(name="Watchdog Total Bans", value=format(watchdog['watchdog_total'], ',d'), inline=False)
			return await ctx.send(embed=embed)
		elif arg1.lower() == 'skyblock':
			if not arg2 or arg2 == 'news':
				route = Route(
					'GET',
					'/skyblock/news'
				)
				sbnews = await self.bot.http.hypixel.request(route)
				paginator = WrappedPaginator(prefix='', suffix='', max_size=250)
				for entry in sbnews['items']:
					paginator.add_line(f'[{entry["title"]}]({entry["link"]})\n{entry["text"]}\n')
				embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.now(datetime.timezone.utc))
				interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
				return await interface.send_to(ctx)
		if arg2 is None:
			channel = ctx.message.channel
			color = ctx.author.color
			async with channel.typing():
				try:
					player = hypixel.Player(arg1)
				except hypixel.PlayerNotFoundException:
					raise commands.ArgumentParsingError('Couldn\'t find that player...')
				except AttributeError:
					raise commands.ArgumentParsingError('Couldn\'t find that player...')
				p = player.JSON
				tributes = p.get('tourney', {}).get('total_tributes', 0) # TOURNAMENT TRIBUTES
				level = str(player.getLevel()).split('.')[0]
				lastlogin = p.get('lastLogin', 0)
				lastlogout = p.get('lastLogout', 1)
				if lastlogin > lastlogout:
					status = "Online!"
				else:
					status = "Offline!"
				tag = None
				route = Route(
					'GET',
					f'/guild/player/{player.UUID}'
				)
				guild = await self.bot.http.sk1er.request(route)
				if guild.get('success', False):
					guild = guild['guild']
					tag = guild['tag'] if 'tag' in guild else None
					if tag:
						tagcolor = guild['tagColor'] if 'tagColor' in guild else 'GRAY'
						if tagcolor == 'GRAY' or tagcolor == 'GREY':
							tag = f'§7[{tag}]'
						elif tagcolor == 'GOLD':
							tag = f'§6[{tag}]'
						elif tagcolor == 'DARK_GREEN':
							tag = f'§2[{tag}]'
						elif tagcolor == 'YELLOW':
							tag = f'§e[{tag}]'
						elif tagcolor == 'DARK_AQUA':
							tag = f'§3[{tag}]'
						if not tag:
							tag = f'§7[{tag}]'
				route = Route(
					'GET',
					f'/player/{player.UUID}'
				)
				apiplayer = await self.bot.http.sk1er.request(route)
				if apiplayer['success']:
					try:
						nametag = apiplayer['player']['playerdisplay'].replace('§0YOUTUBE', '§fYOUTUBE') if 'playerdisplay' in apiplayer else apiplayer['player']['display'].replace('§0YOUTUBE', '§fYOUTUBE')
					except Exception:
						displayname = p['displayname']
						nametag = f'§f{displayname}'
				if tag:
					nametag = f'{nametag} {tag}'
				if nametag:
					parsedtxt = mcfont.parse(nametag)
					width = mcfont.get_width(parsedtxt)
					img = Image.new('RGBA', (width+25, 42))
					mcfont.render((5, 0), parsedtxt, img)
					buf = BytesIO()
					img.save(buf, format='PNG')
					buf.seek(0)
					customtag = discord.File(buf, 'imaginereadingthefilename.png')
				if arg2 is None:
					msg = await ctx.send(f"Retrieving {discord.utils.escape_mentions(discord.utils.escape_markdown(p['displayname']))}'s info...")
					uuid = player.UUID
					embed = discord.Embed(title=f"{discord.utils.escape_markdown(p['displayname'])}'s Info", colour=color, timestamp=datetime.datetime.now(datetime.timezone.utc))
					if nametag:
						embed.set_image(url=f'attachment://imaginereadingthefilename.png')
					embed.set_thumbnail(url=f"https://crafatar.com/avatars/{uuid}?overlay=true")
					embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
					embed.add_field(name="Online Status", value=status, inline=True)
					language = p.get('userLanguage', 'Not Set')
					embed.add_field(name="Language", value=language, inline=True)
					channel = p.get('channel', 'ALL')
					embed.add_field(name="Chat Channel", value=channel, inline=True)
					embed.add_field(name="Level", value=level, inline=True)
					embed.add_field(name="Karma", value=format(p.get('karma', 0), ',d'), inline=True)
					if 'twitter' not in ctx.config.get('mod.linkfilter'):
						twitter = p.get('socialMedia', {}).get('TWITTER', 'Not Set')
					else:
						twitter = 'Hidden'
					if 'youtube' not in ctx.config.get('mod.linkfilter'):
						yt = p.get('socialMedia', {}).get('links', {}).get('YOUTUBE', 'Not Set')
					else:
						yt = 'Hidden'
					insta = p.get('socialMedia', {}).get('INSTAGRAM', 'Not Set')
					if 'twitch' not in ctx.config.get('mod.linkfilter'):
						twitch = p.get('socialMedia', {}).get('TWITCH', 'Not Set')
					else:
						twitch = 'Hidden'
					beam = p.get('socialMedia', {}).get('BEAM', 'Not Set')
					if 'discord' not in ctx.config.get('mod.linkfilter'):
						dscrd = p.get('socialMedia', {}).get('links', {}).get('DISCORD', 'Not Set')
					else:
						dscrd = 'Hidden'
					embed.add_field(name="Social Media", value=f"Twitter: {twitter}\nYouTube: {yt}\nInstagram: {insta}\nTwitch: {twitch}\nBeam: {beam}\nDiscord: {dscrd}", inline=False)
					if tributes != 0:
						embed.add_field(name="Tournament Tributes", value=tributes, inline=False)
					if customtag:
						await msg.delete()
						await ctx.send(embed=embed, file=customtag)
					else:
						await msg.edit(content=None, embed=embed)
		elif arg2 == 'friends':
			uuid = await self.name_to_uuid(arg1)
			if not uuid:
				return await ctx.error(f'Couldn\'t find that player')
			route = Route(
				'GET',
				f'/friends/{uuid}'
			)
			friends = await self.bot.http.sk1er.request(route)
			paginator = WrappedPaginator(
				prefix=f'''-----------------------------------------------------
                           Friends ({len(friends)}) >>''',
				suffix='-----------------------------------------------------',
				max_size=512
			)
			for uuid in friends:
				friend = friends[uuid]
				try:
					name = re.sub(remcolor, '', friend['display'], 0, re.IGNORECASE)
					time = str(datetime.datetime.fromtimestamp(friend['time']/1000, datetime.timezone.utc)).split('.')[0]
				except TypeError:
					raise commands.ArgumentParsingError('Couldn\'t find that persons friends. Check the name and try again')
					return
				paginator.add_line(discord.utils.escape_markdown(f'{name} added on {time}'))
			embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.now(datetime.timezone.utc))
			interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
			await interface.send_to(ctx)
		elif arg2 == 'guild':
			uuid = await self.name_to_uuid(arg1)
			if not uuid:
				return await ctx.error(f'Couldn\'t find that player')
			route = Route(
				'GET',
				f'/guild/player/{uuid}'
			)
			guild = await self.bot.http.sk1er.request(route)
			if guild['success'] != True:
				raise commands.ArgumentParsingError('Couldn\'t find a guild. Maybe they aren\'t in one...')
			guild = guild['guild']
			embed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.now(datetime.timezone.utc))
			embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
			gtagcolor = guild.get('tagColor', 'GRAY').lower().replace('_', ' ').capitalize()
			gtag = guild.get('tag', '')
			if gtag:
				gtag = f'[{gtag}] ({gtagcolor})'
			desc = guild.get('description', 'No Description Set.')
			embed.add_field(name=f"{arg1}'s guild", value=f"{guild['name']} {gtag}\n{desc}\n\nLevel: {guild['level_calc']}")
			embed.add_field(name="Joinable?", value=guild.get('joinable', 'False'), inline=False)
			embed.add_field(name="Publicly Listed?", value=guild.get('publiclyListed', 'False'), inline=False)
			embed.add_field(name="Legacy Rank", value=format(guild.get('legacyRanking', -1), ',d'), inline=False)
			games = []
			for game in guild.get('preferredGames', ['this is a placeholder']):
				games.append(picklegames.get(game, 'Preferred Games not set.'))
			embed.add_field(name="Preferred Games", value=', '.join(games) if games else 'Preferred Games not set.', inline=False)
			ranks = []
			for rank in guild.get('ranks', {'name': 'No custom ranks', 'tag': ''}):
				name = rank['name']
				if not rank.get('tag', ''):
					tag = ''
				else:
					tag = rank['tag']
					tag = f'[{tag}]'
				ranks.append(f'{name} {tag}')
			embed.add_field(name="Ranks", value='\n'.join(ranks) if ranks else 'No custom ranks', inline=False)
			await ctx.send(embed=embed)
			gname = guild['name']
			paginatorembed = discord.Embed(title=f'{gname}\'s Members ({len(guild["members"])})', color=ctx.author.color, timestamp=datetime.datetime.now(datetime.timezone.utc))
			ranktags = {}
			for rank in ranks:
				ranktags[rank.split(' ')[0]] = rank.split(' ')[1]
			paginator = WrappedPaginator(prefix='', suffix='', max_size=380)
			for member in guild['members']:
				name = re.sub(remcolor, '', member.get('displayname', member.get('name', 'Unknown Player')), 0, re.IGNORECASE)
				joined = str(datetime.datetime.fromtimestamp(member['joined']/1000, datetime.timezone.utc)).split('.')[0]
				try:
					ranktag = ranktags[member['rank']]
				except KeyError:
					ranktag = ''
				if ranktag != '':
					paginator.add_line(f'{name} {ranktag} joined on {joined}')
				else:
					paginator.add_line(f'{name} joined on {joined}')
			interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=paginatorembed)
			await interface.send_to(ctx)

	# some commands that aren't hypixel related but don't really belong anywhere else so they're going here since it's minecraft

	@commands.command(description='View a player\'s Minecraft skin')
	async def skin(self, ctx, *, ign: str = None):
		if not ign:
			return await ctx.error('You must provide a name!')
		uid = await self.name_to_uuid(ign)
		timestamp = str(datetime.datetime.now(datetime.timezone.utc).timestamp()).split('.')[0]
		embed = discord.Embed(color=ctx.author.color)
		embed.set_image(url=f'https://mc-heads.net/body/{uid}/{timestamp}')
		embed.set_footer(text=f'Requested by {ctx.author}', icon_url=str(ctx.author.avatar_url_as(static_format='png', size=2048)))
		await ctx.send(embed=embed)

	@commands.command(description='View the UUID for a Minecraft player')
	async def mcuuid(self, ctx, *, ign: str = None):
		if not ign:
			return await ctx.error('You must provide a name!')
		uid = await self.name_to_uuid(ign)
		await ctx.send(f'{ign} has the UUID {uid}')

	@commands.command(description='View the current status of Minecraft services')
	async def mcstatus(self, ctx):
		emotes = {
			'green': '<:check:674359197378281472>',
			'yellow': '<a:fireWarning:660148304486727730>',
			'red': '<:xmark:674359427830382603>'
		}
		statuses = {
			'green': 'No Issues',
			'yellow': 'Some Issues',
			'red': 'Service Unavailable'
		}
		services = {
			'minecraft.net': '**Website**',
			'session.minecraft.net': '**Sessions**',
			'authserver.mojang.com': '**Auth**',
			'textures.minecraft.net': '**Skins**',
			'api.mojang.com': '**API**'
		}
		async with aiohttp.ClientSession() as s:
			async with s.get('https://status.mojang.com/check') as r:
				await s.close()
				if r.status == 200:
					status = await r.json()
				else:
					return await ctx.error('Failed to check status')
		s = []
		for service in status:
			for name, state in service.items():
				if name in services:
					s.append(f'{emotes[state]} {services[name]}: {statuses[state]}')
		embed = discord.Embed(color=ctx.author.color, description='\n'.join(s))
		return await ctx.send(embed=embed)


def setup(bot):
	bot.add_cog(Hypixel(bot))
	bot.logger.info(f'$GREENLoaded Hypixel cog!')
