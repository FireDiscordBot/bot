import logging
from discord.ext import commands
import discord


class Help(commands.Cog):
	"""Handles the help command for Fire"""
	def __init__(self, bot):
		self.bot = bot

	def formatter(self, i, stack=1, ignore_hidden=False):
		for cmd in i:
			if cmd.hidden and not ignore_hidden:
				continue
			line = '- ' + cmd.help.split("\n")[0] if cmd.help else ""
			yield "\u200b " * (stack*2) + f"• **{cmd}** {line}\n"
			if isinstance(cmd, commands.Group):
				yield from self.formatter(cmd.commands, stack+1)

	def format_help_for(self, item, color):
		embed = discord.Embed(colour=color)
		embed.set_footer(text="Use help <command> for more information.")
		if isinstance(item, commands.Cog):
			embed.title = item.qualified_name
			embed.description = type(item).__doc__ or "Nothing provided."
			embed.add_field(name="Commands", value=''.join([t for t in self.formatter(item.get_commands())]))
			return embed
		elif isinstance(item, commands.Group):
			embed.title = f"{item.signature}"
			embed.description = item.help or "Nothing provided."
			fmt = "".join([c for c in self.formatter(item.commands)])
			embed.add_field(name="Subcommands", value=fmt)
			return embed
		elif isinstance(item, commands.Command):
			embed.title = f"{item.signature}"
			embed.description = item.help or "Nothing provided."
			return embed
		else:
			raise RuntimeError("??")

<<<<<<< HEAD
    @commands.command(name="help", hidden=True)
    async def _help(self, ctx, *, cmd: commands.clean_content = None):
        """The help command.
        Use this to view other commands."""
        _all = False
        if not cmd:
            embed = discord.Embed(color=ctx.author.color)
            embed.set_author(name=f"Here's all my commands!", icon_url=ctx.me.avatar_url_as(format="png",
                                                                                                      size=32))
            embed.set_footer(text=f"Prefix: {ctx.prefix}")
            n = []
            for cog in self.bot.cogs.values():
                if sum(1 for n in cog.get_commands() if not (n.hidden and not _all)) == 0:
                    continue
                cogname = f'{cog}'.split('.')
                if cogname[1] == 'fire':
                    name = 'Main Commands'
                elif cogname[1] == 'music':
                    name = 'Music Commands'
                elif cogname[1] == 'pickle':
                    name = 'Hypixel Commands'
                elif cogname[1] == 'ksoft':
                    name = 'KSoft.Si API Commands'
                elif cogname[1] == 'skier':
                    name = 'Sk1er/Hyperium Commands'
                elif cogname[1] == 'utils':
                    name = 'Utility Commands'
                n.append(f"**{name}**\n")
                for cmd in self.formatter(cog.get_commands(), ignore_hidden=_all):
                    n.append(cmd)
            embed.description = "".join(n)
            await ctx.send(embed=embed)
        else:
            item = self.bot.get_cog(cmd) or self.bot.get_command(cmd)
            if not item:
                return await ctx.send(f"Couldn't find anything named '{cmd}'.")
            await ctx.send(embed=self.format_help_for(item, ctx.author.color))
=======
	@commands.command(name="help", hidden=True)
	async def _help(self, ctx, *, cmd: commands.clean_content = None):
		"""The help command.
		Use this to view other commands."""
		_all = False
		if not cmd:
			embed = discord.Embed(color=ctx.author.color)
			embed.set_author(name=f"Here's all my commands!", icon_url=ctx.me.avatar_url_as(format="png",
																									  size=32))
			embed.set_footer(text=f"Prefix: {ctx.prefix}")
			n = []
			for cog in self.bot.cogs.values():
				if sum(1 for n in cog.get_commands() if not (n.hidden and not _all)) == 0:
					continue
				cogname = f'{cog}'.split('.')
				if cogname[1] == 'fire':
					name = 'Main Commands'
				elif cogname[1] == 'music':
					name = 'Music Commands'
				elif cogname[1] == 'pickle':
					name = 'Hypixel Commands'
				elif cogname[1] == 'ksoft':
					name = 'KSoft.Si API Commands'
				elif cogname[1] == 'skier':
					name = 'Sk1er/Hyperium Commands'
				elif cogname[1] == 'utils':
					name = 'Utility Commands'
				elif cogname[1] == 'wta':
					name = 'Winner Takes All'
				n.append(f"**{name}**\n")
				for cmd in self.formatter(cog.get_commands(), ignore_hidden=_all):
					n.append(cmd)
			embed.description = "".join(n)
			await ctx.send(embed=embed)
		else:
			item = self.bot.get_cog(cmd) or self.bot.get_command(cmd)
			if not item:
				return await ctx.send(f"Couldn't find anything named '{cmd}'.")
			await ctx.send(embed=self.format_help_for(item, ctx.author.color))
>>>>>>> 6f4b73e6fac59c3c7db31335b9683dcb46aa6bea


def setup(bot):
	bot.old_help = bot.remove_command("help")
	bot.add_cog(Help(bot))


def teardown(bot):
	bot.add_command(bot.old_help)
