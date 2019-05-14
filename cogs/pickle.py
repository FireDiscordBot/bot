import discord
from discord.ext import commands
import datetime
import json
import time
import logging
import aiohttp
import hypixel
import re
from jishaku.paginators import WrappedPaginator, PaginatorEmbedInterface

remcolor = r'\u00A7[0-9A-FK-OR]'

now = datetime.datetime.utcnow()
launchtime = datetime.datetime.utcnow()

logging.basicConfig(filename='bot.log',level=logging.INFO)

print("hypixel.py has been loaded")

with open('config.json', 'r') as cfg:
	config = json.load(cfg)

hypixelkey = config['hypixel']
keys = [config['hypixel']]
hypixel.setKeys(keys)

uuidToName = {}

def isadmin(ctx):
	if str(ctx.author.id) not in config['admins']:
		admin = False
	else:
		admin = True
	return admin

async def getprefix(ctx):
	if not ctx.guild:
		return "$"
	with open('prefixes.json', 'r') as pfx:
		customprefix = json.load(pfx)
	try:
		prefix = customprefix[str(ctx.guild.id)]
	except Exception:
		prefix = "$"
	return prefix

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

class pickle(commands.Cog, name="Hypixel Commands"):
	def __init__(self, bot):
		self.bot = bot
  
	@commands.command(description="Get hypixel stats")
	async def hypixel(self, ctx, arg1: str = None, arg2: str = None):
		"""PFXhypixel <IGN [<guild|friends|session>]|key|watchdog>"""
		if arg1 == None:
			msg = await ctx.send("I need an IGN, `key` or `watchdog`")
			time.sleep(5)
			try:
				await msg.delete()
			except Exception as e:
				return
			return
		if arg1.lower() == "watchdog":
			async with aiohttp.ClientSession() as session:
				async with session.get(f'https://api.hypixel.net/watchdogstats?key={hypixelkey}') as resp:
					watchdog = await resp.json()
			color = ctx.author.color
			embed = discord.Embed(title="Watchdog Stats", colour=color, timestamp=datetime.datetime.utcnow())
			embed.set_thumbnail(url="https://hypixel.net/attachments/cerbtrimmed-png.245674/")
			embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
			embed.add_field(name="Watchdog Bans in the last minute", value=watchdog['watchdog_lastMinute'], inline=False)
			embed.add_field(name="Staff bans in the last day", value=format(watchdog['staff_rollingDaily'], ',d'), inline=False)
			embed.add_field(name="Watchdog bans in the last day", value=format(watchdog['watchdog_rollingDaily'], ',d'), inline=False)
			embed.add_field(name="Staff Total Bans", value=format(watchdog['staff_total'], ',d'), inline=False)
			embed.add_field(name="Watchdog Total Bans", value=format(watchdog['watchdog_total'], ',d'), inline=False)
			await ctx.send(embed=embed)
			return
		if arg1.lower() == "key":
			lastmin = "0"
			async with aiohttp.ClientSession() as session:
				async with session.get(f'https://api.hypixel.net/key?key={hypixelkey}') as resp:
					key = await resp.json()
			try:
				lastmin = key['record']['queriesInPastMin']
			except Exception as e:
				pass
			color = ctx.author.color
			embed = discord.Embed(title="My API Key Stats", colour=color, timestamp=datetime.datetime.utcnow())
			embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
			embed.add_field(name="Owner", value="GamingGeeek (4686e7b58815485d8bc4a45445abb984)", inline=False)
			embed.add_field(name="Total Requests", value=format(key['record']['totalQueries'], ',d'), inline=False)
			embed.add_field(name="Requests in the past minute", value=lastmin, inline=False)
			await ctx.send(embed=embed)
			return
		if arg2 == None:
			msg = await ctx.send(f"Requesting info about {discord.utils.escape_markdown(arg1)} from the Hypixel API!")
			channel = ctx.message.channel
			color = ctx.author.color
			async with channel.typing():
				try:
					player = hypixel.Player(arg1)
				except hypixel.PlayerNotFoundException:
					raise commands.ArgumentParsingError('Couldn\'t find that player...')
				p = player.JSON
				try:
					tributes = p['tourney']['total_tributes'] # TOURNAMENT TRIBUTES
				except KeyError:
					tributes = 0
				level = str(player.getLevel()).split('.')[0]
				try:
					rankcolor = p['rankPlusColor']
				except Exception:
					rankcolor = "RED"
				try:
					prefixcolor = p['monthlyRankColor']
				except Exception as e:
					prefixcolor = "GOLD"
				lastlogin = p['lastLogin']
				lastlogout = p['lastLogout']
				if lastlogin > lastlogout:
					status = "Online!"
				else:
					status = "Offline!"
				try:
					rank = player.getRank()['rank']
				except Exception:
					rank = None
				if rank == "MVP+":
					if rankcolor == "RED":
						rankimg = "https://gaminggeek.club/pickleranks/MVPplusone.png"
					if rankcolor == "GOLD":
						rankimg = "https://gaminggeek.club/pickleranks/MVPplustwo.png"
					if rankcolor == "GREEN":
						rankimg = "https://gaminggeek.club/pickleranks/MVPplusthree.png"
					if rankcolor == "YELLOW":
						rankimg = "https://gaminggeek.club/pickleranks/MVPplusfour.png"
					if rankcolor == "LIGHT_PURPLE":
						rankimg = "https://gaminggeek.club/pickleranks/MVPplusfive.png"
					if rankcolor == "WHITE":
						rankimg = "https://gaminggeek.club/pickleranks/MVPplussix.png"
					if rankcolor == "BLUE":
						rankimg = "https://gaminggeek.club/pickleranks/MVPplusseven.png"
					if rankcolor == "DARK_GREEN":
						rankimg = "https://gaminggeek.club/pickleranks/MVPpluseight.png"
					if rankcolor == "DARK_RED":
						rankimg = "https://gaminggeek.club/pickleranks/MVPplusnine.png"
					if rankcolor == "DARK_AQUA":
						rankimg = "https://gaminggeek.club/pickleranks/MVPplusten.png"
					if rankcolor == "DARK_PURPLE":
						rankimg = "https://gaminggeek.club/pickleranks/MVPpluseleven.png"
					if rankcolor == "DARK_GRAY":
						rankimg = "https://gaminggeek.club/pickleranks/MVPplustwelve.png"
					if rankcolor == "BLACK":
						rankimg = "https://gaminggeek.club/pickleranks/MVPplusthirteen.png"
				if rank == "MVP":
					rankimg = "https://gaminggeek.club/pickleranks/MVP.png"
				if rank == "VIP+":
					rankimg = "https://gaminggeek.club/pickleranks/VIPplus.png"
				if rank == "VIP":
					rankimg = "https://gaminggeek.club/pickleranks/VIP.png"
				try:
					monthlyrank = p['monthlyPackageRank']
				except Exception:
					monthlyrank = None
				if monthlyrank == "SUPERSTAR":
					if prefixcolor == "GOLD":
						if rankcolor ==  "Default (Red)":
							rankimg = "https://gaminggeek.club/pickleranks/SUPERSTARlred.png"
						if rankcolor ==  "GOLD":
							rankimg = "https://gaminggeek.club/pickleranks/SUPERSTARgold.png"
						if rankcolor ==  "GREEN":
							rankimg = "https://gaminggeek.club/pickleranks/SUPERSTARlgreen.png"
						if rankcolor ==  "YELLOW":
							rankimg = "https://gaminggeek.club/pickleranks/SUPERSTARyellow.png"
						if rankcolor ==  "LIGHT_PURPLE":
							rankimg = "https://gaminggeek.club/pickleranks/SUPERSTARlpurple.png"
						if rankcolor ==  "WHITE":
							rankimg = "https://gaminggeek.club/pickleranks/SUPERSTARwhite.png"
						if rankcolor ==  "BLUE":
							rankimg = "https://gaminggeek.club/pickleranks/SUPERSTARblue.png"
						if rankcolor ==  "DARK_GREEN":
							rankimg = "https://gaminggeek.club/pickleranks/SUPERSTARdgreen.png"
						if rankcolor ==  "DARK_RED":
							rankimg = "https://gaminggeek.club/pickleranks/SUPERSTARdred.png"
						if rankcolor ==  "DARK_AQUA":
							rankimg = "https://gaminggeek.club/pickleranks/SUPERSTARdaqua.png"
						if rankcolor ==  "DARK_PURPLE":
							rankimg = "https://gaminggeek.club/pickleranks/SUPERSTARdpurple.png"
						if rankcolor ==  "DARK_GRAY":
							rankimg = "https://gaminggeek.club/pickleranks/SUPERSTARgrey.png"
						if rankcolor ==  "BLACK":
							rankimg = "https://gaminggeek.club/pickleranks/SUPERSTARblack.png"
					if prefixcolor == "AQUA":
						if rankcolor ==  "Default (Red)":
							rankimg = "https://gaminggeek.club/pickleranks/threeRED.png"
						if rankcolor ==  "GOLD":
							rankimg = "https://gaminggeek.club/pickleranks/threeGOLD.png"
						if rankcolor ==  "GREEN":
							rankimg = "https://gaminggeek.club/pickleranks/threeGREEN.png"
						if rankcolor ==  "YELLOW":
							rankimg = "https://gaminggeek.club/pickleranks/threeYELLOW.png"
						if rankcolor ==  "LIGHT_PURPLE":
							rankimg = "https://gaminggeek.club/pickleranks/threePURPLE.png"
						if rankcolor ==  "WHITE":
							rankimg = "https://gaminggeek.club/pickleranks/threeWHITE.png"
						if rankcolor ==  "BLUE":
							rankimg = "https://gaminggeek.club/pickleranks/threeBLUE.png"
						if rankcolor ==  "DARK_GREEN":
							rankimg = "https://gaminggeek.club/pickleranks/threeDGREEN.png"
						if rankcolor ==  "DARK_RED":
							rankimg = "https://gaminggeek.club/pickleranks/threeDRED.png"
						if rankcolor ==  "DARK_AQUA":
							rankimg = "https://gaminggeek.club/pickleranks/threeDAQUA.png"
						if rankcolor ==  "DARK_PURPLE":
							rankimg = "https://gaminggeek.club/pickleranks/threeDPURPLE.png"
						if rankcolor ==  "DARK_GRAY":
							rankimg = "https://gaminggeek.club/pickleranks/threeGREY.png"
						if rankcolor ==  "BLACK":
							rankimg = "https://gaminggeek.club/pickleranks/threeBLACK.png"
				if rank == "Non":
					rankimg = "https://gaminggeek.club/pickleranks/NON.png"
				if rank == "YouTube":
					rankimg = "https://gaminggeek.club/pickleranks/YOUTUBE.png"
				if rank == "Helper":
					rankimg = "https://gaminggeek.club/pickleranks/HELPER.png"
				if rank == "Moderator":
					rankimg = "https://gaminggeek.club/pickleranks/MOD.png"
				if rank == "Admin":
					rankimg = "https://gaminggeek.club/pickleranks/ADMIN.png"
				if arg2 == None:
					msg = await ctx.send(f"Retrieving {discord.utils.escape_markdown(p['displayname'])}'s info...")
					uuid = player.UUID
					embed = discord.Embed(title=f"{discord.utils.escape_markdown(p['displayname'])}'s Info", colour=color, timestamp=datetime.datetime.utcnow())
					if rankimg != None:
						embed.set_image(url=rankimg)
					embed.set_thumbnail(url=f"https://crafatar.com/avatars/{uuid}?overlay=true")
					embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
					embed.add_field(name="Online Status", value=status, inline=True)
					try:
						language = p['userLanguage']
					except Exception:
						language = "Not Set"
					embed.add_field(name="Language", value=language, inline=True)
					try:
						channel = p['channel']
					except Exception:
						channel = "ALL"
					embed.add_field(name="Chat Channel", value=channel, inline=True)
					try:
						ver = p['mcVersionRp']
					except Exception:
						ver = "Unknown"
					embed.add_field(name="Version", value=ver, inline=True)
					embed.add_field(name="Level", value=level, inline=True)
					embed.add_field(name="Karma", value=format(p['karma'], ',d'), inline=True)
					try:
						twitter = p['socialMedia']['TWITTER']
					except Exception:
						twitter = "Not Set"
					try:
						yt = p['socialMedia']['links']['YOUTUBE']
					except Exception:
						yt = "Not Set"
					try:
						insta = p['socialMedia']['INSTAGRAM']
					except Exception:
						insta = "Not Set"
					try:
						twitch = p['socialMedia']['TWITCH']
					except Exception:
						twitch = "Not Set"
					try:
						beam = p['socialMedia']['BEAM']
					except Exception:
						beam = "Not Set"
					try:
						dscrd = p['socialMedia']['links']['DISCORD']
					except Exception:
						dscrd = "Not Set"
					embed.add_field(name="Social Media", value=f"Twitter: {twitter}\nYouTube: {yt}\nInstagram: {insta}\nTwitch: {twitch}\nBeam: {beam}\nDiscord: {dscrd}", inline=True)
					if tributes != 0:
						embed.add_field(name="Tournament Tributes", value=tributes, inline=False)
					await msg.edit(content=None, embed=embed)
		elif arg2 == 'session':
			msg = await ctx.send(f"Retrieving {discord.utils.escape_markdown(arg1)}'s session...")
			try:
				player = hypixel.Player(arg1)
			except hypixel.PlayerNotFoundException:
				raise commands.ArgumentParsingError('Couldn\'t find that player...')
				return
			uuid = player.JSON['uuid']
			rank = player.getRank()['rank']
			async with aiohttp.ClientSession() as session:
				async with session.get(f'https://api.hypixel.net/session?uuid={uuid}&key={hypixelkey}') as resp:
					session = await resp.json()
			rankhide = ['YouTube', 'Helper', 'Moderator', 'Admin']
			if rank in rankhide:
				hidden = True
				if isadmin(ctx):
					hidden = False
			else:
				hidden = False
			if session['session'] == None:
				embed = discord.Embed(title=f"Session of {discord.utils.escape_markdown(arg1)}", colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
				embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
				embed.add_field(name="Session", value="undefined", inline=False)
				embed.add_field(name="Why?", value=f"{discord.utils.escape_markdown(arg1)} is not in a game", inline=False)
				await msg.edit(content=None, embed=embed)
			else:
				embed = discord.Embed(title=f"Session of {discord.utils.escape_markdown(arg1)}", colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
				embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
				embed.add_field(name="Playing", value=f"{session['session']['gameType']}", inline=False)
				if hidden == True:
					embed.add_field(name="Server", value="Hidden", inline=False)
				else:
					embed.add_field(name="Server", value=f"{session['session']['server']}", inline=False)
				playingWith = []
				if hidden == True:
					embed.add_field(name="Playing With", value="Hidden", inline=False)
				else:
					for player in session['session']['players']:
						try:
							playingWith.append(uuidToName[player])
						except KeyError:
							async with aiohttp.ClientSession() as session:
								async with session.get(f'https://sessionserver.mojang.com/session/minecraft/profile/{player}') as resp:
									jresp = await resp.json()
									playingWith.append(jresp['name'])
									uuidToName.update({player: jresp['name']})
					embed.add_field(name="Playing With", value=discord.utils.escape_markdown('\n'.join(playingWith)), inline=False)
				await msg.edit(content=None, embed=embed)
			return
		elif arg2 == 'friends':
			async with aiohttp.ClientSession() as session:
				async with session.get(f'https://api.sk1er.club/friends/{arg1}') as resp:
					b = await resp.read()
					friends = json.loads(b)
			paginator = WrappedPaginator(prefix=f'-----------------------------------------------------\n                           Friends ({len(friends)}) >>', suffix='-----------------------------------------------------', max_size=512)
			for uuid in friends:
				friend = friends[uuid]
				try:
					name = re.sub(remcolor, '', friend['display'], 0, re.IGNORECASE)
					time = str(datetime.datetime.utcfromtimestamp(friend['time']/1000)).split('.')[0]
				except TypeError:
					raise commands.ArgumentParsingError('Couldn\'t find that persons friends. Check the name and try again')
					return
				paginator.add_line(discord.utils.escape_markdown(f'{name} added on {time}'))
			paginatorembed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.utcnow())
			interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=paginatorembed)
			await interface.send_to(ctx)
		elif arg2 == 'guild':
			async with aiohttp.ClientSession() as session:
				async with session.get(f'https://api.sk1er.club/guild/player/{arg1}') as resp:
					b = await resp.read()
					guild = json.loads(b)
			if guild['success'] != True:
				raise commands.ArgumentParsingError('Couldn\'t find a guild. Maybe they aren\'t in one...')
			guild = guild['guild']
			embed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
			embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
			try:
				gtagcolor = guild['tagColor'].lower().replace('_', ' ').capitalize()
				gtag = guild['tag']
				gtag = f'[{gtag}] ({gtagcolor})'
			except KeyError:
				gtag = ''
			try:
				desc = guild['description']
			except KeyError:
				desc = 'No Description Set.'
			embed.add_field(name=f"{arg1}'s guild", value=f"{guild['name']} {gtag}\n{desc}\n\nLevel: {guild['level_calc']}")
			try:
				embed.add_field(name="Joinable?", value=guild['joinable'], inline=False)
			except KeyError:
				embed.add_field(name="Joinable?", value=False, inline=False)
			try:
				embed.add_field(name="Publicly Listed?", value=guild['publiclyListed'], inline=False)
			except KeyError:
				pass
			try:
				embed.add_field(name="Legacy Rank", value=format(guild['legacyRanking'], ',d'), inline=False)
			except KeyError:
				pass
			games = []
			try:
				for game in guild['preferredGames']:
					games.append(picklegames[game])
			except KeyError:
				games.append('Preferred Games not set.')
			embed.add_field(name="Preferred Games", value=', '.join(games), inline=False)
			ranks = []
			try:
				for rank in guild['ranks']:
					name = rank['name']
					if rank['tag'] == None:
						tag = ''
					else:
						tag = rank['tag']
						tag = f'[{tag}]'
					ranks.append(f'{name} {tag}')
			except KeyError:
				ranks.append('No custom ranks.')
			embed.add_field(name="Ranks", value='\n'.join(ranks), inline=False)
			await ctx.send(embed=embed)
			gname = guild['name']
			paginatorembed = discord.Embed(title=f'{gname}\'s Members', color=ctx.author.color, timestamp=datetime.datetime.utcnow())
			ranktags = {}
			for rank in ranks:
				ranktags[rank.split(' ')[0]] = rank.split(' ')[1]
			paginator = WrappedPaginator(prefix='', suffix='', max_size=380)
			for member in guild['members']:
				name = re.sub(remcolor, '', member['displayname'], 0, re.IGNORECASE)
				joined = str(datetime.datetime.utcfromtimestamp(member['joined']/1000)).split('.')[0]
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


def setup(bot):
	bot.add_cog(pickle(bot))