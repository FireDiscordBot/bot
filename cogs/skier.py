import discord
from discord.ext import commands
import datetime
import json
import aiohttp
import re

print("skier.py has been loaded")

remcolor = r'&[0-9A-FK-OR]'

with open('config.json', 'r') as cfg:
	config = json.load(cfg)

def isadmin(ctx):
	"""Checks if the author is an admin"""
	if str(ctx.author.id) not in config['admins']:
		admin = False
	else:
		admin = True
	return admin

class skier(commands.Cog, name="Sk1er/Hyperium Commands"):
	def __init__(self, bot):
		self.bot = bot

	@commands.command(description="Get a player's levelhead info")
	async def levelhead(self, ctx, player: str = None):
		"""PFXlevelhead <IGN>"""
		if player == None:
			await ctx.send("What user should I check? (IGNs must be exact capitalization!)")
		else:
			hello = {
				'USER-AGENT': 'Fire (Python 3.7.2 / aiohttp 3.3.2) | Fire Discord Bot',
				'CONTENT-TYPE': 'text/json' 
			}
			async with aiohttp.ClientSession(headers=hello) as session:
				async with session.get(f'https://api.sk1er.club/levelheadv5/{player}/LEVEL') as resp:
					data = await resp.read()
					levelhead = json.loads(data)
					status = resp.status
			try:
				uuid = levelhead['uuid']
			except Exception:
				strlevel = levelhead['strlevel']
				embed = discord.Embed(title=f"{player}'s Levelhead", colour=ctx.author.color, url="https://purchase.sk1er.club/category/1050972", timestamp=datetime.datetime.utcnow())
				embed.add_field(name="Custom Levelhead?", value="Nope :(", inline=False)
				embed.add_field(name="IGN", value=player, inline=False)
				embed.add_field(name="Levelhead", value=f"Level: {levelhead['level']}", inline=False)
				await ctx.send(embed=embed)
				return
			async with aiohttp.ClientSession(headers=hello) as session:
				async with session.get(f'https://api.sk1er.club/levelhead_purchase_status/{uuid}') as resp:
					data = await resp.read()
					purchase = json.loads(data)
					status2 = resp.status
			async with aiohttp.ClientSession(headers=hello) as session:
				async with session.get(f'https://api.hyperium.cc/levelhead_propose/{uuid}') as resp:
					data = await resp.read()
					proposal = json.loads(data)
			if status == 404:
				await ctx.send("Uh oh, Sk1er's API returned 404... Check capitalization and try again")
				return
			if status2 == 404:
				await ctx.send("Uh oh, Sk1er's API returned 404, but I think it's Sk1er's fault")
			if len(uuid) < 28:
				await ctx.send("Uh oh, the UUID I got doesn't look right. Check the spelling of the name")
				return
			header = re.sub(remcolor, '', levelhead['header'], 0, re.IGNORECASE)
			strlevel = re.sub(remcolor, '', levelhead['strlevel'], 0, re.IGNORECASE)
			level = levelhead['level']
			if strlevel == level:
				nocustom = True
			else:
				nocustom = False
			header.replace('/""', '')
			header.replace('\""', '')
			strlevel.replace('/""', '')
			strlevel.replace('\""', '')
			if purchase['tab'] == True:
				tab = "Purchased!"
			else:
				tab = "Not Purchased."
			if purchase['chat'] == True:
				chat = "Purchased!"
			else:
				chat = "Not Purchased."
			if purchase['mediahead'] == True:
				mediahead = "Purchased!"
			else:
				mediahead = "Not Purchased."
			if purchase['head'] > 0:
				head = purchase['head']
			else:
				head = "Not Purchased!"
			embed = discord.Embed(title=f"{player}'s Levelhead", colour=ctx.author.color, url="https://purchase.sk1er.club/category/1050972", timestamp=datetime.datetime.utcnow())
			embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
			if nocustom == True:
				embed.add_field(name="Custom Levelhead?", value="Nope :(", inline=False)
				embed.add_field(name="IGN", value=player, inline=False)
				embed.add_field(name="Levelhead", value=f"Level: {levelhead['level']}", inline=False)
				embed.add_field(name="Other items", value=f"Tab: {tab} \nChat: {chat} \nAddon Head Layers: {head} \nMediahead: {mediahead}", inline=False)
			else:
				embed.add_field(name="Custom Levelhead?", value="Yeah!", inline=False)
				embed.add_field(name="IGN", value=player, inline=False)
				embed.add_field(name="Levelhead", value=f"{header}:{strlevel}", inline=False)
				try:
					denied = proposal['denied']
					nheader = re.sub(remcolor, '', proposal['header'], 0, re.IGNORECASE)
					nstrlevel = re.sub(remcolor, '', proposal['strlevel'], 0, re.IGNORECASE)
				except Exception:
					denied = None
				if denied != None:
					embed.add_field(name='Proposed Levelhead', value=f'{nheader}:{nstrlevel}', inline=False)
					embed.add_field(name='Denied?', value=denied, inline=False)
				embed.add_field(name="Other items", value=f"Tab: {tab} \nChat: {chat} \nAddon Head Layers: {head} \nMediahead: {mediahead}", inline=False)
			await ctx.send(embed=embed)

	@commands.command(description="Check stuff related to Hyperium")
	async def hyperium(self, ctx, player: str = None, task: str = None):
		"""PFXhyperium <IGN <status|purchases> | stats>"""
		if player == None:
			await ctx.send("I can either check a player's info or `stats`")
			return
		hello = {
			'USER-AGENT': 'Fire (Python 3.7.2 / aiohttp 3.3.2) | Fire Discord Bot',
			'CONTENT-TYPE': 'text/json' 
		}
		if player == "stats": 
			async with aiohttp.ClientSession(headers=hello) as session:
				async with session.get('https://api.hyperium.cc/users') as resp:
					data = await resp.read()
					stats = json.loads(data)
					status = resp.status
			if status == 200:
				embed = discord.Embed(title="Hyperium Stats", colour=ctx.author.color, url="https://hyperium.cc/", timestamp=datetime.datetime.utcnow())
				embed.set_thumbnail(url="https://cdn.discordapp.com/emojis/471405283562881073.png")
				embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
				embed.add_field(name="Online Users", value=format(stats['online'], ",d"), inline=False)
				embed.add_field(name="Users Today", value=format(stats['day'], ",d"), inline=False)
				embed.add_field(name="Users This Week", value=format(stats['week'], ",d"), inline=False)
				embed.add_field(name="Total Users", value=format(stats['all'], ",d"), inline=False)
				await ctx.send(embed=embed)
				return
			else:
				await ctx.send("The Hyperium API returned a status code other than 200, which isn't right...")
				return
		if task == "purchases":
			async with aiohttp.ClientSession(headers=hello) as session:
				async with session.get(f'https://api.hyperium.cc/purchases/{player}') as resp:
					data = await resp.read()
					purchases = json.loads(data)
					status = resp.status
			uuid = purchases['uuid']
			async with aiohttp.ClientSession(headers=hello) as session:
				async with session.get(f'https://api.hyperium.cc/purchaseSettings/{uuid}') as resp:
					data = await resp.read()
					settings = json.loads(data)
			if purchases['success'] == True:
				try:
					cosmetics = purchases['hyperium']
				except Exception:
					nocosmetics = True
				else:
					nocosmetics = None
				try:
					currentcape = settings['cape']['url']
				except Exception:
					currentcape = None
				try:
					framesplus = purchases['frames_plus_cape']
				except Exception:
					framesplus = None
				if nocosmetics == True:
					embed = discord.Embed(title=f"Hyperium Purchases for {player}", colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
					embed.set_thumbnail(url="https://cdn.discordapp.com/emojis/471405283562881073.png")
					embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
					embed.add_field(name="Purchased Cosmetics", value='No Cosmetics! Purchase some [here](https://purchase.sk1er.club/)', inline=False)
					await ctx.send(embed=embed)
					return
				c = []
				if 'PARTICLE_BACKGROUND' in cosmetics:
					c.append('Particle Background')
				if 'WING_COSMETIC' in cosmetics:
					c.append('Dragon Wings')
				if 'FLIP_COSMETIC' in cosmetics:
					c.append('Flip')
				if 'DEADMAU5_COSMETIC' in cosmetics:
					c.append('Deadmau5 Ears')
				if 'DRAGON_HEAD' in cosmetics:
					c.append('Dragon Head')
				if 'KILL_TRACKER_MUSCLE' in cosmetics:
					c.append('Muscle Kill Tracker')
				if 'DAB_ON_KILL' in cosmetics:
					c.append('Dab On Kill')
				if 'CHROMA_WIN' in cosmetics:
					c.append('Chroma On Win')
				if 'DEAL_WITH_IT' in cosmetics:
					c.append('Deal With It Glasses')
				if 'BUTT' in cosmetics:
					c.append('Butt')
				if 'DRAGON_COMPANION' in cosmetics:
					c.append('Dragon Companion')
				if 'HAMSTER_COMPANION' in cosmetics:
					c.append('Hamster Companion')
				if 'BACKPACK_ENDER_DRAGON' in cosmetics:
					c.append('Ender Dragon Backpack')
				if 'HAT_TOPHAT' in cosmetics:
					c.append('Tophat')
				if 'HAT_FEZ' in cosmetics:
					c.append('Fez Hat')
				if 'HAT_LEGO' in cosmetics:
					c.append('Lego Hat')
				p = []
				if 'ANIMATION_STATIC_TRAIL' in cosmetics:
					p.append('Static Trail Animation')
				if 'ANIMATION_DOUBLE_TWIRL' in cosmetics:
					p.append('Double Twirl Animation')
				if 'ANIMATION_TRIPLE_TWIRL' in cosmetics:
					p.append('Triple Twirl Animation')
				if 'ANIMATION_QUAD_TWIRL' in cosmetics:
					p.append('Quad Twirl Animation')
				if 'ANIMATION_EXPLODE' in cosmetics:
					p.append('Explosion Animation')
				if 'ANIMATION_VORTEX_OF_DOOM' in cosmetics:
					p.append('Vortex Of Doom Animation')
				if 'ANIMATION_TORNADO' in cosmetics:
					p.append('Tornado Animation')
				if 'ANIMATION_DOUBLE_HELIX' in cosmetics:
					p.append('Double Helix Animation')
				if 'PARTICLE_LAVA_DRIP' in cosmetics:
					p.append('Lava Drip Particle')
				if 'PARTICLE_CRIT' in cosmetics:
					p.append('Crit Particle')
				if 'PARTICLE_NOTE' in cosmetics:
					p.append('Note Particle')
				capes = []
				if 'HYPERIUM_CAPE' in cosmetics:
					capes.append('[Hyperium](https://static.sk1er.club/hyperium/hyperium_cape.png)')
				if 'SK1ER_CAPE' in cosmetics:
					capes.append('[Sk1er](https://static.sk1er.club/hyperium/sk1er_cape.png)')
				if 'QUIG_CAPE' in cosmetics:
					capes.append('[Quig](https://static.sk1er.club/hyperium/quig_cape.png)')
				if 'TIMEDEO_CAPE' in cosmetics:
					capes.append('[TimeDeo](https://static.sk1er.club/hyperium/timedeo_cape.png)')
				if 'BOEH_CAPE' in cosmetics:
					capes.append('[BoehSpam](https://static.sk1er.club/hyperium/boeh_cape.png)')
				if 'IT5MESAM_CAPE' in cosmetics:
					capes.append('[It5MeSam](https://static.sk1er.club/hyperium/it5mesam_cape.png)')
				if 'ITZMAXK_CAPE' in cosmetics:
					capes.append('[ItzMaxK](https://static.sk1er.club/hyperium/itzmaxk_cape.png)')
				if 'SKEPPY_CAPE' in cosmetics:
					capes.append('[Skeppy](https://static.sk1er.club/hyperium/skeppy_cape.png)')
				if 'MARKEYBUILDER_CAPE' in cosmetics:
					capes.append('[MarkeyBuilder](https://static.sk1er.club/hyperium/markeybuilder_cape.png)')
				if 'FLIPFLOP_CAPE' in cosmetics:
					capes.append('[Flip Flop](https://static.sk1er.club/hyperium/flipflop_cape.png)')
				if 'SHOTGUNRAIDS_CAPE' in cosmetics:
					capes.append('[ShotGunRaids](https://static.sk1er.club/hyperium/shotgunraids_cape.png)')
				if 'JUSTVURB_CAPE' in cosmetics:
					capes.append('[JustVurb](https://static.sk1er.club/hyperium/justvurb_cape.png)')
				if 'LEGO_CAPE' in cosmetics:
					capes.append('[Lego Maestro](https://static.sk1er.club/hyperium/lego_cape.png)')
				if 'BPS_CAPE' in cosmetics:
					capes.append('[BlackPlasmaStudios](https://static.sk1er.club/hyperium/bps_cape.png)')
				if 'CUSTOM_CAPE_ANIMATED' in cosmetics:
					capes.append('Custom Animated Cape')
				if 'CUSTOM_CAPE_STATIC' in cosmetics:
					capes.append('Custom Cape')
				if framesplus != None:
					capes.append('Frames+ Cape')
				embed = discord.Embed(title=f"Hyperium Purchases for {player}", colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
				embed.set_thumbnail(url="https://cdn.discordapp.com/emojis/471405283562881073.png")
				embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
				try:
					credittotal = purchases['total_credits']
				except Exception:
					credittotal = 0
				try:
					creditremain = purchases['remaining_credits']
				except Exception:
					creditremain = 0
				try:
					creditlvl = purchases['remaining_levelhead_credits']
				except Exception:
					creditlvl = 0
				embed.add_field(name="Credits", value=f"Total: {credittotal}\nRemaining: {creditremain}\nLevelhead Credits: {creditlvl}", inline=False)
				if c != []:
					embed.add_field(name="Purchased Cosmetics", value=', '.join(c), inline=False)
				else:
					embed.add_field(name="Purchased Cosmetics", value='No Cosmetics', inline=False)
				if nocosmetics == True:
					embed.add_field(name="Purchased Cosmetics", value='No Cosmetics', inline=False)
				if p != []:
					embed.add_field(name="Purchased Particles", value=', '.join(p), inline=False)
				else:
					embed.add_field(name="Purchased Particles", value='No Particles', inline=False)
				if capes != []:
					embed.add_field(name="Purchased Capes", value=', '.join(capes), inline=False)
				else:
					embed.add_field(name="Purchased Capes", value='No Capes', inline=False)
				if currentcape != None:
					embed.add_field(name="Current Cape", value=f'[{player}\'s Cape]({currentcape})', inline=False)
				await ctx.send(embed=embed)
		if task == "status":
			async with aiohttp.ClientSession(headers=hello) as session:
				async with session.get(f'https://api.hyperium.cc/online/{player}') as resp:
					data = await resp.read()
					online = json.loads(data)
					status = resp.status
			async with aiohttp.ClientSession() as session:
				async with session.get('https://raw.githubusercontent.com/HyperiumClient/Hyperium-Repo/master/files/staff.json') as resp:
					data = await resp.read()
					staff = json.loads(data)
			for value in staff:
				if value['ign'] == player:
					pstaff = True
					pdot = value['color'].lower()
			try:
				pstaff == True
			except Exception:
				pstaff = False
			try:
				pdot != None
			except Exception:
				pdot = "None"
			pdot = pdot.replace('_', ' ').title()
			embed = discord.Embed(title=f"Hyperium Status for {player}", colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
			embed.set_thumbnail(url="https://cdn.discordapp.com/emojis/471405283562881073.png")
			embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
			embed.add_field(name="Online?", value=online['status'], inline=False)
			if pstaff == True:
				embed.add_field(name="Dot Color", value=pdot, inline=False)
			await ctx.send(embed=embed)
		if task == None:
			await ctx.send("What should I do? I can check `status` or `purchases`")
  
def setup(bot):
	bot.add_cog(skier(bot))