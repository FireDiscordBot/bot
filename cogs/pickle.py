import discord
from discord.ext import commands
import datetime
import json
import logging
import aiohttp
import hypixel
import re
import os
from jishaku.paginators import WrappedPaginator, PaginatorEmbedInterface
from fire.jsontable import table2json
from PIL import Image
from . import mcfont

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

	# @commands.command(description='Generate a rank image from text, e.g. `&d[PIG&c+&d]`')
	# async def rankimg(self, ctx, *, arg):
	# 	'''PFXrankimg <rank>'''
	# 	text = arg.replace('&', '§')
	# 	parsedtxt = mcfont.parse(text)
	# 	width = mcfont.get_width(parsedtxt)
	# 	img = Image.new('RGBA', (width+25, 42))
	# 	mcfont.render((5, 0), parsedtxt, img)
	# 	img.save('lastrank.png')
	# 	file = discord.File('lastrank.png')
	# 	embed = discord.Embed(color=ctx.author.color)
	# 	embed.set_image(url=f'attachment://lastrank.png')
	# 	await ctx.send(embed=embed, file=file)
  
	@commands.command(description="Get hypixel stats")
	async def hypixel(self, ctx, arg1: str = None, arg2: str = None):
		"""PFXhypixel <IGN [<guild|friends|session>]|key|watchdog>"""
		if arg1 == None:
			msg = await ctx.send("I need an IGN, `key` or `watchdog`", delete_after=5)
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
		if arg1.lower() == 'leaderboard':
			if arg2 == None:
				return
				#Make available leaderboards embed
			elif arg2.lower() == 'level':
				msg = await ctx.send(f"Generating Network Level leaderboard...")
				headers = {
					'USER-AGENT': 'Fire (Python 3.7.2 / aiohttp 3.3.2) | Fire Discord Bot',
					'CONTENT-TYPE': 'text/json' 
				}
				async with aiohttp.ClientSession(headers=headers) as session:
					async with session.get(f'https://sk1er.club/leaderboards/newdata/LEVEL') as resp:
						content = await resp.read()
				lbjson = table2json(content, ['Position', 'Change', 'Name', 'Level', 'Karma', 'Kills', 'Wins'])
				paginator = WrappedPaginator(prefix='```vbs\n-------------------------------------', suffix='-------------------------------------\n```', max_size=420)
				for player in lbjson:
					try:
						pos = player['Position']
						name = player['Name']
						level = player['Level']
						paginator.add_line(f'[{pos}] {name} - {level}')
					except Exception as e:
						pass
				embed = discord.Embed(title='Network Level Leaderboard', color=ctx.author.color, timestamp=datetime.datetime.utcnow())
				interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
				await msg.delete()
				return await interface.send_to(ctx)
			elif arg2.lower() == 'karma':
				msg = await ctx.send(f"Generating Karma leaderboard...")
				headers = {
					'USER-AGENT': 'Fire (Python 3.7.2 / aiohttp 3.3.2) | Fire Discord Bot',
					'CONTENT-TYPE': 'text/json' 
				}
				async with aiohttp.ClientSession(headers=headers) as session:
					async with session.get(f'https://sk1er.club/leaderboards/newdata/KARMA') as resp:
						content = await resp.read()
				lbjson = table2json(content, ['Position', 'Change', 'Name', 'Karma', 'Level', 'Kills', 'Wins'])
				paginator = WrappedPaginator(prefix='```vbs\n-------------------------------------', suffix='-------------------------------------\n```', max_size=420)
				for player in lbjson:
					try:
						pos = player['Position']
						name = player['Name']
						karma = player['Karma']
						paginator.add_line(f'[{pos}] {name} - {karma}')
					except Exception as e:
						pass
				embed = discord.Embed(title='Karma Leaderboard', color=ctx.author.color, timestamp=datetime.datetime.utcnow())
				interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
				await msg.delete()
				return await interface.send_to(ctx)
			elif arg2.lower() == 'coins':
				msg = await ctx.send(f"Generating Coins leaderboard...")
				headers = {
					'USER-AGENT': 'Fire (Python 3.7.2 / aiohttp 3.3.2) | Fire Discord Bot',
					'CONTENT-TYPE': 'text/json' 
				}
				async with aiohttp.ClientSession(headers=headers) as session:
					async with session.get(f'https://sk1er.club/leaderboards/newdata/COINS') as resp:
						content = await resp.read()
				lbjson = table2json(content, ['Position', 'Change', 'Name', 'Coins', 'Karma', 'Kills', 'Wins'])
				paginator = WrappedPaginator(prefix='```vbs\n-------------------------------------', suffix='-------------------------------------\n```', max_size=420)
				for player in lbjson:
					try:
						pos = player['Position']
						name = player['Name']
						coins = player['Coins']
						paginator.add_line(f'[{pos}] {name} - {coins}')
					except Exception as e:
						pass
				embed = discord.Embed(title='Coins Leaderboard', color=ctx.author.color, timestamp=datetime.datetime.utcnow())
				interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
				await msg.delete()
				return await interface.send_to(ctx)
			elif arg2.lower() == 'kills':
				msg = await ctx.send(f"Generating Total Kills leaderboard...")
				headers = {
					'USER-AGENT': 'Fire (Python 3.7.2 / aiohttp 3.3.2) | Fire Discord Bot',
					'CONTENT-TYPE': 'text/json' 
				}
				async with aiohttp.ClientSession(headers=headers) as session:
					async with session.get(f'https://sk1er.club/leaderboards/newdata/TOTAL_KILLS') as resp:
						content = await resp.read()
				lbjson = table2json(content, ['Position', 'Change', 'Name', 'Kills', 'Level', 'Wins', 'Quests'])
				paginator = WrappedPaginator(prefix='```vbs\n-------------------------------------', suffix='-------------------------------------\n```', max_size=420)
				for player in lbjson:
					try:
						pos = player['Position']
						name = player['Name']
						kills = player['Kills']
						paginator.add_line(f'[{pos}] {name} - {kills}')
					except Exception as e:
						pass
				embed = discord.Embed(title='Total Kills Leaderboard', color=ctx.author.color, timestamp=datetime.datetime.utcnow())
				interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
				await msg.delete()
				return await interface.send_to(ctx)
			elif arg2.lower() == 'wins':
				msg = await ctx.send(f"Generating Total Wins leaderboard...")
				headers = {
					'USER-AGENT': 'Fire (Python 3.7.2 / aiohttp 3.3.2) | Fire Discord Bot',
					'CONTENT-TYPE': 'text/json' 
				}
				async with aiohttp.ClientSession(headers=headers) as session:
					async with session.get(f'https://sk1er.club/leaderboards/newdata/TOTAL_WINS') as resp:
						content = await resp.read()
				lbjson = table2json(content, ['Position', 'Change', 'Name', 'Wins', 'Level', 'Kills', 'Quests'])
				paginator = WrappedPaginator(prefix='```vbs\n-------------------------------------', suffix='-------------------------------------\n```', max_size=420)
				for player in lbjson:
					try:
						pos = player['Position']
						name = player['Name']
						wins = player['Wins']
						paginator.add_line(f'[{pos}] {name} - {wins}')
					except Exception as e:
						pass
				embed = discord.Embed(title='Total Wins Leaderboard', color=ctx.author.color, timestamp=datetime.datetime.utcnow())
				interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
				await msg.delete()
				return await interface.send_to(ctx)
			elif arg2.lower() == 'glevel':
				msg = await ctx.send(f"Generating Guild Level leaderboard...")
				headers = {
					'USER-AGENT': 'Fire (Python 3.7.2 / aiohttp 3.3.2) | Fire Discord Bot',
					'CONTENT-TYPE': 'text/json' 
				}
				async with aiohttp.ClientSession(headers=headers) as session:
					async with session.get(f'https://sk1er.club/leaderboards/newdata/GUILD_LEVEL') as resp:
						content = await resp.read()
				lbjson = table2json(content, ['Position', 'Change', 'Name', 'Level', 'Wins', 'Exp', 'Legacy', 'Created'])
				paginator = WrappedPaginator(prefix='```vbs\n-------------------------------------', suffix='-------------------------------------\n```', max_size=420)
				for player in lbjson:
					try:
						pos = player['Position']
						name = player['Name']
						level = player['Level']
						paginator.add_line(f'[{pos}] {name} - {level}')
					except Exception as e:
						pass
				embed = discord.Embed(title='Guild Level Leaderboard', color=ctx.author.color, timestamp=datetime.datetime.utcnow())
				interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
				await msg.delete()
				return await interface.send_to(ctx)
			elif arg2.lower() == 'gexperience':
				msg = await ctx.send(f"Generating Guild Experience leaderboard...")
				headers = {
					'USER-AGENT': 'Fire (Python 3.7.2 / aiohttp 3.3.2) | Fire Discord Bot',
					'CONTENT-TYPE': 'text/json' 
				}
				async with aiohttp.ClientSession(headers=headers) as session:
					async with session.get(f'https://sk1er.club/leaderboards/newdata/GUILD_LEVEL') as resp:
						content = await resp.read()
				lbjson = table2json(content, ['Position', 'Change', 'Name', 'Level', 'Wins', 'Exp', 'Legacy', 'Created'])
				paginator = WrappedPaginator(prefix='```vbs\n-------------------------------------', suffix='-------------------------------------\n```', max_size=420)
				for player in lbjson:
					try:
						pos = player['Position']
						name = player['Name']
						exp = player['Exp']
						paginator.add_line(f'[{pos}] {name} - {exp}')
					except Exception as e:
						pass
				embed = discord.Embed(title='Guild Experience Leaderboard', color=ctx.author.color, timestamp=datetime.datetime.utcnow())
				interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
				await msg.delete()
				return await interface.send_to(ctx)
			elif arg2.lower() == 'gwins':
				msg = await ctx.send(f"Generating Guild Wins leaderboard...")
				headers = {
					'USER-AGENT': 'Fire (Python 3.7.2 / aiohttp 3.3.2) | Fire Discord Bot',
					'CONTENT-TYPE': 'text/json' 
				}
				async with aiohttp.ClientSession(headers=headers) as session:
					async with session.get(f'https://sk1er.club/leaderboards/newdata/GUILD_WINS') as resp:
						content = await resp.read()
				lbjson = table2json(content, ['Position', 'Change', 'Name', 'Wins', 'Level', 'Exp', 'Legacy', 'Created'])
				paginator = WrappedPaginator(prefix='```vbs\n-------------------------------------', suffix='-------------------------------------\n```', max_size=420)
				for player in lbjson:
					try:
						pos = player['Position']
						name = player['Name']
						wins = player['Wins']
						paginator.add_line(f'[{pos}] {name} - {wins}')
					except Exception as e:
						pass
				embed = discord.Embed(title='Guild Wins Leaderboard', color=ctx.author.color, timestamp=datetime.datetime.utcnow())
				interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
				await msg.delete()
				return await interface.send_to(ctx)
			else:
				return await ctx.send('Unknown leaderboard.')
		if arg2 == None:
			cleaned = discord.utils.escape_mentions(discord.utils.escape_markdown(arg1))
			msg = await ctx.send(f"Requesting info about {cleaned} from the Hypixel API!")
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
				headers = {
					'USER-AGENT': 'Fire (Python 3.7.2 / aiohttp 3.3.2) | Fire Discord Bot',
					'CONTENT-TYPE': 'text/json' 
				}
				try:
					tributes = p['tourney']['total_tributes'] # TOURNAMENT TRIBUTES
				except KeyError:
					tributes = 0
				level = str(player.getLevel()).split('.')[0]
				# try:
				# 	rankcolor = p['rankPlusColor']
				# except Exception:
				# 	rankcolor = "RED"
				# try:
				# 	prefixcolor = p['monthlyRankColor']
				# except Exception as e:
				# 	prefixcolor = "GOLD"
				lastlogin = p['lastLogin'] if 'lastLogin' in p else 0
				lastlogout = p['lastLogout'] if 'lastLogout' in p else 1
				if lastlogin > lastlogout:
					status = "Online!"
				else:
					status = "Offline!"
				# try:
				# 	rank = player.getRank()['rank']
				# except Exception:
				# 	rank = None
				# if rank == "MVP+":
				# 	if rankcolor == "RED":
				# 		rankimg = "https://gaminggeek.dev/assets/pickleranks/MVPplusone.png"
				# 	if rankcolor == "GOLD":
				# 		rankimg = "https://gaminggeek.dev/assets/pickleranks/MVPplustwo.png"
				# 	if rankcolor == "GREEN":
				# 		rankimg = "https://gaminggeek.dev/assets/pickleranks/MVPplusthree.png"
				# 	if rankcolor == "YELLOW":
				# 		rankimg = "https://gaminggeek.dev/assets/pickleranks/MVPplusfour.png"
				# 	if rankcolor == "LIGHT_PURPLE":
				# 		rankimg = "https://gaminggeek.dev/assets/pickleranks/MVPplusfive.png"
				# 	if rankcolor == "WHITE":
				# 		rankimg = "https://gaminggeek.dev/assets/pickleranks/MVPplussix.png"
				# 	if rankcolor == "BLUE":
				# 		rankimg = "https://gaminggeek.dev/assets/pickleranks/MVPplusseven.png"
				# 	if rankcolor == "DARK_GREEN":
				# 		rankimg = "https://gaminggeek.dev/assets/pickleranks/MVPpluseight.png"
				# 	if rankcolor == "DARK_RED":
				# 		rankimg = "https://gaminggeek.dev/assets/pickleranks/MVPplusnine.png"
				# 	if rankcolor == "DARK_AQUA":
				# 		rankimg = "https://gaminggeek.dev/assets/pickleranks/MVPplusten.png"
				# 	if rankcolor == "DARK_PURPLE":
				# 		rankimg = "https://gaminggeek.dev/assets/pickleranks/MVPpluseleven.png"
				# 	if rankcolor == "DARK_GRAY":
				# 		rankimg = "https://gaminggeek.dev/assets/pickleranks/MVPplustwelve.png"
				# 	if rankcolor == "BLACK":
				# 		rankimg = "https://gaminggeek.dev/assets/pickleranks/MVPplusthirteen.png"
				# if rank == "MVP":
				# 	rankimg = "https://gaminggeek.dev/assets/pickleranks/MVP.png"
				# if rank == "VIP+":
				# 	rankimg = "https://gaminggeek.dev/assets/pickleranks/VIPplus.png"
				# if rank == "VIP":
				# 	rankimg = "https://gaminggeek.dev/assets/pickleranks/VIP.png"
				# try:
				# 	monthlyrank = p['monthlyPackageRank']
				# except Exception:
				# 	monthlyrank = None
				# if monthlyrank == "SUPERSTAR":
				# 	if prefixcolor == "GOLD":
				# 		if rankcolor ==  "Default (Red)":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/SUPERSTARlred.png"
				# 		if rankcolor ==  "GOLD":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/SUPERSTARgold.png"
				# 		if rankcolor ==  "GREEN":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/SUPERSTARlgreen.png"
				# 		if rankcolor ==  "YELLOW":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/SUPERSTARyellow.png"
				# 		if rankcolor ==  "LIGHT_PURPLE":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/SUPERSTARlpurple.png"
				# 		if rankcolor ==  "WHITE":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/SUPERSTARwhite.png"
				# 		if rankcolor ==  "BLUE":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/SUPERSTARblue.png"
				# 		if rankcolor ==  "DARK_GREEN":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/SUPERSTARdgreen.png"
				# 		if rankcolor ==  "DARK_RED":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/SUPERSTARdred.png"
				# 		if rankcolor ==  "DARK_AQUA":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/SUPERSTARdaqua.png"
				# 		if rankcolor ==  "DARK_PURPLE":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/SUPERSTARdpurple.png"
				# 		if rankcolor ==  "DARK_GRAY":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/SUPERSTARgrey.png"
				# 		if rankcolor ==  "BLACK":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/SUPERSTARblack.png"
				# 	if prefixcolor == "AQUA":
				# 		if rankcolor ==  "Default (Red)":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/threeRED.png"
				# 		if rankcolor ==  "GOLD":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/threeGOLD.png"
				# 		if rankcolor ==  "GREEN":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/threeGREEN.png"
				# 		if rankcolor ==  "YELLOW":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/threeYELLOW.png"
				# 		if rankcolor ==  "LIGHT_PURPLE":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/threePURPLE.png"
				# 		if rankcolor ==  "WHITE":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/threeWHITE.png"
				# 		if rankcolor ==  "BLUE":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/threeBLUE.png"
				# 		if rankcolor ==  "DARK_GREEN":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/threeDGREEN.png"
				# 		if rankcolor ==  "DARK_RED":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/threeDRED.png"
				# 		if rankcolor ==  "DARK_AQUA":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/threeDAQUA.png"
				# 		if rankcolor ==  "DARK_PURPLE":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/threeDPURPLE.png"
				# 		if rankcolor ==  "DARK_GRAY":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/threeGREY.png"
				# 		if rankcolor ==  "BLACK":
				# 			rankimg = "https://gaminggeek.dev/assets/pickleranks/threeBLACK.png"
				# if rank == "Non":
				# 	rankimg = "https://gaminggeek.dev/assets/pickleranks/NON.png"
				# if rank == "YouTube":
				# 	rankimg = "https://gaminggeek.dev/assets/pickleranks/YOUTUBE.png"
				# if rank == "Helper":
				# 	rankimg = "https://gaminggeek.dev/assets/pickleranks/HELPER.png"
				# if rank == "Moderator":
				# 	rankimg = "https://gaminggeek.dev/assets/pickleranks/MOD.png"
				# if rank == "Admin":
				# 	rankimg = "https://gaminggeek.dev/assets/pickleranks/ADMIN.png"
				# customtag = False
				tag = None
				async with aiohttp.ClientSession(headers=headers) as session:
					async with session.get(f'https://api.sk1er.club/guild/player/{arg1}') as resp:
						b = await resp.read()
						guild = json.loads(b)
				if guild['success']:
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
				async with aiohttp.ClientSession(headers=headers) as session:
					async with session.get(f'https://api.sk1er.club/player/{arg1}') as resp:
						b = await resp.read()
						apiplayer = json.loads(b)
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
					img.save('lastrank.png')
					customtag = discord.File('lastrank.png')
				if arg2 == None:
					msg = await ctx.send(f"Retrieving {discord.utils.escape_mentions(discord.utils.escape_markdown(p['displayname']))}'s info...")
					uuid = player.UUID
					embed = discord.Embed(title=f"{discord.utils.escape_markdown(p['displayname'])}'s Info", colour=color, timestamp=datetime.datetime.utcnow())
					if nametag:
						embed.set_image(url=f'attachment://lastrank.png')
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
					embed.add_field(name="Karma", value=format(p['karma'] if 'karma' in p else 0, ',d'), inline=True)
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
					# try:
					# 	parsedtxt = mcfont.parse(p['prefix'])
					# 	width = mcfont.get_width(parsedtxt)
					# 	img = Image.new('RGBA', (width+25, 42))
					# 	mcfont.render((5, 0), parsedtxt, img)
					# 	img.save('lastrank.png')
					# 	customtag = discord.File('lastrank.png')
					# 	embed.set_image(url=f'attachment://lastrank.png')
					# except Exception:
					# 	pass
					# if customtag:
					# 	embed.add_field(name='Base Rank', value=monthlyrank or rank, inline=False)
					# elif rankimg != None:
					# 	embed.set_image(url=rankimg)
					if customtag:
						await msg.delete()
						await ctx.send(embed=embed, file=customtag)
					else:
						await msg.edit(content=None, embed=embed)
		elif arg2 == 'session':
			msg = await ctx.send(f"Retrieving {discord.utils.escape_mentions(discord.utils.escape_markdown(arg1))}'s session...")
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
			headers = {
				'USER-AGENT': 'Fire (Python 3.7.2 / aiohttp 3.3.2) | Fire Discord Bot',
				'CONTENT-TYPE': 'text/json' 
			}
			async with aiohttp.ClientSession(headers=headers) as session:
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
			embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.utcnow())
			interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
			await interface.send_to(ctx)
		elif arg2 == 'guild':
			headers = {
				'USER-AGENT': 'Fire (Python 3.7.2 / aiohttp 3.3.2) | Fire Discord Bot',
				'CONTENT-TYPE': 'text/json' 
			}
			async with aiohttp.ClientSession(headers=headers) as session:
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