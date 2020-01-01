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
from discord.ext import commands
import datetime
import discord
import aiohttp
import json

print("wta.py has been loaded")

with open('config.json', 'r') as cfg:
	config = json.load(cfg)

class mcs(commands.Cog, name="Minecraft Saturdays"):
	def __init__(self, bot):
		self.bot = bot
		self.season = 3

	@commands.group(name='mcs', description='Minecraft Saturdays Commands', aliases=['minecraftsaturdays', 'mcsaturdays'], invoke_without_command=True)
	async def mcsat(self, ctx):
		if ctx.invoked_subcommand:
			return
		embed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
		embed.set_author(name=ctx.guild.name, icon_url=str(ctx.guild.icon_url))
		embed.add_field(name='Minecraft Saturdays Commands', value=f'> {ctx.prefix}mcs games | Get a list of this weeks games\n> {ctx.prefix}mcs teams | Get\'s info about the teams', inline=False)
		await ctx.send(embed=embed)

	@mcsat.command(name='games')
	async def mcsgames(self, ctx):
		async with aiohttp.ClientSession() as s:
			async with s.get(f'https://minecraftsaturdays.net/api/games/{self.season}') as r:
				g = await r.text()
				g = json.loads(g)
				games = g['games']
		embed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.utcnow(), description='**Minecraft Saturdays Games**')
		for game in games:
			embed.add_field(name=game['name'], value=game['description'], inline=False)
		embed.set_footer(text='https://minecraftsaturdays.net/', icon_url='https://cdn.discordapp.com/icons/618826436299456533/6dfe2d224d8d919cac6bd71dcf7b0955.png')
		await ctx.send(embed=embed)

	@mcsat.command(name='teams', aliases=['players'])
	async def mcsteams(self, ctx):
		async with aiohttp.ClientSession() as s:
			async with s.get(f'https://minecraftsaturdays.net/api/roster/{self.season}') as r:
				p = await r.text()
				p = json.loads(p)
				teams = p['teams']
		t = []
		for team in teams:
			team["score"] = 0
			for x in team["players"]:
				team["score"] += x["score"]
			players = [f'[{x["name"]}]({x["link"]})\n⭐ Points: {x["score"]}' for x in team["players"]]
			players = "\n".join(players)
			t.append({
				'text': f'**Team {teams.index(team) + 1}:**\n{players}\n\n🏅 Wins: {team["players"][0]["wins"]}\n⭐ Total Points: {team["score"]}\n',
				'score': team["score"]
			})
		t = sorted(t, key=lambda t: t["score"])
		t.reverse()
		paginator = WrappedPaginator(prefix='**Minecraft Saturdays Teams**', suffix='', max_size=650)
		for team in t:
			paginator.add_line(team["text"])
		embed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
		footer = {'text': 'https://minecraftsaturdays.net/', 'icon_url': 'https://cdn.discordapp.com/icons/618826436299456533/6dfe2d224d8d919cac6bd71dcf7b0955.png'}
		interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed, _footer=footer)
		await interface.send_to(ctx)



def setup(bot):
	bot.add_cog(mcs(bot))
