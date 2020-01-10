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

import logging
from discord.ext import commands
import discord
import typing
from random import randint
from urllib.parse import quote


class Help(commands.Cog):
	"""Handles the help command for Fire"""
	def __init__(self, bot):
		self.bot = bot

	@commands.command(name='help', description='Provides help for those who need it')
	async def help(self, ctx):
		cmdurl = 'https://gaminggeek.dev/commands'
		prefix = ctx.prefix.replace(ctx.me.mention, '@Fire ')
		if randint(1, 100) == 69 or ctx.author.id == 287698408855044097:
			cmdurl = f'https://fire.gaminggeek.space/commands?prefix={quote(prefix)}'
		embed = discord.Embed(colour=ctx.author.color, description=f'Here\'s some helpful links\n\n[Commands]({cmdurl})\n[Support Server](https://gaminggeek.dev/discord)\n[Invite Me](https://gaminggeek.dev/fire)\n[Donate](https://gaminggeek.dev/patreon)')
		embed.set_author(name='Help has arrived', icon_url=str(ctx.me.avatar_url_as(static_format='png', size=2048)))
		await ctx.send(embed=embed)


	# @commands.command(name='help', description='Provides help for those who need it')
	# async def oldhelp(self, ctx, item: str = None):
	# 	cogs = []
	# 	cmds = {}
	# 	allcmds = False
	# 	cmdhelp = False
	# 	usedprefix = ctx.prefix
	# 	if usedprefix == f'{ctx.guild.me.mention} ':
	# 		usedprefix = '@Fire '
	# 	if item:
	# 		if item == 'all':
	# 			allcmds = True
	# 			cmdhelp = False
	# 		else:
	# 			cmd = self.bot.get_command(item)
	# 			if not cmd:
	# 				raise commands.ArgumentParsingError(f'No command called {item}')
	# 			cmdhelp = True
	# 	else:
	# 		cmdhelp = False
	# 	if not cmdhelp:
	# 		for cog in self.bot.cogs.values():
	# 			skip = False
	# 			if not allcmds:
	# 				if cog.qualified_name.lower() == 'jishaku':
	# 					skip = True
	# 				if cog.qualified_name.lower() == 'help':
	# 					skip = True
	# 				if cog.qualified_name.lower() == 'premium commands':
	# 					premiumGuilds = cog.premiumGuilds
	# 					if not ctx.guild.id in premiumGuilds:
	# 						skip = True
	# 				if cog.qualified_name.lower() == 'discordbotsorgapi':
	# 					skip = True
	# 				if cog.qualified_name.lower() == 'fire api':
	# 					skip = True
	# 			if not skip:
	# 				cogs.append(f'**{cog.qualified_name.upper()}**')
	# 				cmds[f'**{cog.qualified_name.upper()}**'] = []
	# 				for cmd in cog.get_commands():
	# 					if cmd.hidden:
	# 						if allcmds:
	# 							cmds[f'**{cog.qualified_name.upper()}**'].append(cmd.name)
	# 						else:
	# 							pass
	# 					else:
	# 						cmds[f'**{cog.qualified_name.upper()}**'].append(cmd.name)
	# 				cmds[f'**{cog.qualified_name.upper()}**'] = ' - '.join(cmds[f'**{cog.qualified_name.upper()}**'])
	# 	elif cmd:
	# 		name = cmd.name
	# 		desc = cmd.description
	# 		usage = cmd.help.replace('PFX', ctx.prefix)
	# 		embed = discord.Embed(colour=ctx.author.color)
	# 		embed.set_author(name=f"Help has arrived for {name}!", icon_url="https://cdn.discordapp.com/avatars/444871677176709141/1b7beb893e2bf1d2a759d869e7f287dd.webp?size=1024")
	# 		embed.add_field(name="Description", value=desc, inline=False)
	# 		embed.add_field(name="Usage", value=usage, inline=False)
	# 		embed.set_footer(text="<> = Required | [<>] = Optional")
	# 		await ctx.send(embed=embed)
	# 		return
	# 	text = []
	# 	for cog in cogs:
	# 		text.append(f'{cog}\n{cmds[cog]}\n')
	# 	embed = discord.Embed(colour=ctx.author.color, description='\n'.join(text))
	# 	embed.set_author(name="Help has arrived!", icon_url="https://cdn.discordapp.com/avatars/444871677176709141/1b7beb893e2bf1d2a759d869e7f287dd.webp?size=1024")
	# 	embed.set_footer(text=f"Do {usedprefix}help <command> for more information")
	# 	await ctx.send(embed=embed)


def setup(bot):
	bot.old_help = bot.remove_command("help")
	bot.add_cog(Help(bot))


def teardown(bot):
	bot.add_command(bot.old_help)
