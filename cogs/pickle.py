import discord
from discord.ext import commands
import datetime
import json
import time
import logging
import aiohttp
import hypixel

now = datetime.datetime.now()
launchtime = datetime.datetime.utcnow()

logging.basicConfig(filename='bot.log',level=logging.INFO)

print("hypixel.py has been loaded")

with open('config.json', 'r') as cfg:
	config = json.load(cfg)

hypixelkey = config['hypixel']
keys = [config['hypixel']]
hypixel.setKeys(keys)

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

class pickle:
	def __init__(self, bot):
		self.bot = bot
  
	@commands.command(description="Get hypixel stats")
	async def hypixel(self, ctx, arg1: str = None, arg2: str = None):
		if arg1 == None:
			msg = await ctx.send("I need an IGN, `help`, `key` or `watchdog`")
			time.sleep(5)
			try:
				await msg.delete()
			except Exception as e:
				print(f"I failed to delete a message due to... {e}")
		if arg1.lower() == "watchdog":
			async with aiohttp.ClientSession() as session:
				async with session.get(f'https://api.hypixel.net/watchdogstats?key={hypixelkey}') as resp:
					watchdog = await resp.json()
			color = ctx.author.color
			embed = discord.Embed(title="Watchdog Stats", colour=color, timestamp=datetime.datetime.now())
			embed.set_thumbnail(url="https://hypixel.net/attachments/cerbtrimmed-png.245674/")
			embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
			embed.add_field(name="Watchdog Bans in the last minute", value=watchdog['watchdog_lastMinute'], inline=False)
			embed.add_field(name="Staff bans in the last day", value=watchdog['staff_rollingDaily'], inline=False)
			embed.add_field(name="Watchdog bans in the last day", value=watchdog['watchdog_rollingDaily'], inline=False)
			embed.add_field(name="Staff Total Bans", value=watchdog['staff_total'], inline=False)
			embed.add_field(name="Watchdog Total Bans", value=watchdog['watchdog_total'], inline=False)
			await ctx.send(embed=embed)
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
			embed = discord.Embed(title="My API Key Stats", colour=color, timestamp=datetime.datetime.now())
			embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
			embed.add_field(name="Owner", value="PoppyIsFake (4686e7b58815485d8bc4a45445abb984)", inline=False)
			embed.add_field(name="Total Requests", value=key['record']['totalQueries'], inline=False)
			embed.add_field(name="Requests in the past minute", value=lastmin, inline=False)
			await ctx.send(embed=embed)
		else:
			msg = await ctx.send(f"Requesting info about `{arg1}` from the Hypixel API!")
			channel = ctx.message.channel
			color = ctx.author.color
			async with channel.typing():
				player = hypixel.Player(arg1)
				p = player.JSON
				level = round(player.getLevel())
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
						rankimg = "https://firediscordbot.tk/pickleranks/MVPplusone.png"
					if rankcolor == "GOLD":
						rankimg = "https://firediscordbot.tk/pickleranks/MVPplustwo.png"
					if rankcolor == "GREEN":
						rankimg = "https://firediscordbot.tk/pickleranks/MVPplusthree.png"
					if rankcolor == "YELLOW":
						rankimg = "https://firediscordbot.tk/pickleranks/MVPplusfour.png"
					if rankcolor == "LIGHT_PURPLE":
						rankimg = "https://firediscordbot.tk/pickleranks/MVPplusfive.png"
					if rankcolor == "WHITE":
						rankimg = "https://firediscordbot.tk/pickleranks/MVPplussix.png"
					if rankcolor == "BLUE":
						rankimg = "https://firediscordbot.tk/pickleranks/MVPplusseven.png"
					if rankcolor == "DARK_GREEN":
						rankimg = "https://firediscordbot.tk/pickleranks/MVPpluseight.png"
					if rankcolor == "DARK_RED":
						rankimg = "https://firediscordbot.tk/pickleranks/MVPplusnine.png"
					if rankcolor == "DARK_AQUA":
						rankimg = "https://firediscordbot.tk/pickleranks/MVPplusten.png"
					if rankcolor == "DARK_PURPLE":
						rankimg = "https://firediscordbot.tk/pickleranks/MVPpluseleven.png"
					if rankcolor == "GREY":
						rankimg = "https://firediscordbot.tk/pickleranks/MVPplustwelve.png"
					if rankcolor == "BLACK":
						rankimg = "https://firediscordbot.tk/pickleranks/MVPplusthirteen.png"
				if rank == "MVP":
					rankimg = "https://firediscordbot.tk/pickleranks/MVP.png"
				if rank == "VIP+":
					rankimg = "https://firediscordbot.tk/pickleranks/VIPplus.png"
				if rank == "VIP":
					rankimg = "https://firediscordbot.tk/pickleranks/VIP.png"
				try:
					monthlyrank = p['monthlyPackageRank']
				except Exception:
					monthlyrank = None
				if monthlyrank == "SUPERSTAR":
					if prefixcolor == "GOLD":
						if rankcolor ==  "Default (Red)":
							rankimg = "https://firediscordbot.tk/pickleranks/SUPERSTARlred.png"
						if rankcolor ==  "GOLD":
							rankimg = "https://firediscordbot.tk/pickleranks/SUPERSTARgold.png"
						if rankcolor ==  "GREEN":
							rankimg = "https://firediscordbot.tk/pickleranks/SUPERSTARlgreen.png"
						if rankcolor ==  "YELLOW":
							rankimg = "https://firediscordbot.tk/pickleranks/SUPERSTARyellow.png"
						if rankcolor ==  "LIGHT_PURPLE":
							rankimg = "https://firediscordbot.tk/pickleranks/SUPERSTARlpurple.png"
						if rankcolor ==  "WHITE":
							rankimg = "https://firediscordbot.tk/pickleranks/SUPERSTARwhite.png"
						if rankcolor ==  "BLUE":
							rankimg = "https://firediscordbot.tk/pickleranks/SUPERSTARblue.png"
						if rankcolor ==  "DARK_GREEN":
							rankimg = "https://firediscordbot.tk/pickleranks/SUPERSTARdgreen.png"
						if rankcolor ==  "DARK_RED":
							rankimg = "https://firediscordbot.tk/pickleranks/SUPERSTARdred.png"
						if rankcolor ==  "DARK_AQUA":
							rankimg = "https://firediscordbot.tk/pickleranks/SUPERSTARdaqua.png"
						if rankcolor ==  "DARK_PURPLE":
							rankimg = "https://firediscordbot.tk/pickleranks/SUPERSTARdpurple.png"
						if rankcolor ==  "GREY":
							rankimg = "https://firediscordbot.tk/pickleranks/SUPERSTARgrey.png"
						if rankcolor ==  "BLACK":
							rankimg = "https://firediscordbot.tk/pickleranks/SUPERSTARblack.png"
					if prefixcolor == "AQUA":
						if rankcolor ==  "Default (Red)":
							rankimg = "https://firediscordbot.tk/pickleranks/threeRED.png"
						if rankcolor ==  "GOLD":
							rankimg = "https://firediscordbot.tk/pickleranks/threeGOLD.png"
						if rankcolor ==  "GREEN":
							rankimg = "https://firediscordbot.tk/pickleranks/threeGREEN.png"
						if rankcolor ==  "YELLOW":
							rankimg = "https://firediscordbot.tk/pickleranks/threeYELLOW.png"
						if rankcolor ==  "LIGHT_PURPLE":
							rankimg = "https://firediscordbot.tk/pickleranks/threePURPLE.png"
						if rankcolor ==  "WHITE":
							rankimg = "https://firediscordbot.tk/pickleranks/threeWHITE.png"
						if rankcolor ==  "BLUE":
							rankimg = "https://firediscordbot.tk/pickleranks/threeBLUE.png"
						if rankcolor ==  "DARK_GREEN":
							rankimg = "https://firediscordbot.tk/pickleranks/threeDGREEN.png"
						if rankcolor ==  "DARK_RED":
							rankimg = "https://firediscordbot.tk/pickleranks/threeDRED.png"
						if rankcolor ==  "DARK_AQUA":
							rankimg = "https://firediscordbot.tk/pickleranks/threeDAQUA.png"
						if rankcolor ==  "DARK_PURPLE":
							rankimg = "https://firediscordbot.tk/pickleranks/threeDPURPLE.png"
						if rankcolor ==  "GREY":
							rankimg = "https://firediscordbot.tk/pickleranks/threeGREY.png"
						if rankcolor ==  "BLACK":
							rankimg = "https://firediscordbot.tk/pickleranks/threeBLACK.png"
				if rank == "NONE":
					rankimg = "https://firediscordbot.tk/pickleranks/NON.png"
				if rank == "YouTube":
					rankimg = "https://firediscordbot.tk/pickleranks/YOUTUBE.png"
				if rank == "Helper":
					rankimg = "https://firediscordbot.tk/pickleranks/HELPER.png"
				if rank == "Moderator":
					rankimg = "https://firediscordbot.tk/pickleranks/MOD.png"
				if rank == "Admin":
					rankimg = "https://firediscordbot.tk/pickleranks/ADMIN.png"
				if arg2 == None:
					msg = await ctx.send(f"Retrieving {p['displayname']}'s info...")
					uuid = player.UUID
					embed = discord.Embed(title=f"{p['displayname']}'s Info", colour=color, timestamp=datetime.datetime.now())
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
					await msg.edit(embed=embed)

def setup(bot):
	bot.add_cog(pickle(bot))