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


from discord.ext import commands
from urllib.parse import quote
import discord


class Help(commands.Cog):
    """Handles the help command for Fire"""

    def __init__(self, bot):
        self.bot = bot

    @commands.command(name='help', description='Provides help for those who need it')
    async def help(self, ctx):
        prefix = ctx.prefix.replace(
            '<@444871677176709141> ', '@Fire ').replace('<@!444871677176709141>', '@Fire ')
        embed = discord.Embed(colour=ctx.author.color, description=f'''Here\'s some helpful links
[Commands](https://fire.gaminggeek.dev/commands?prefix={quote(prefix)})
[Support Server](https://inv.wtf/fire)
[Invite Me](https://inv.wtf/bot)
[Vote for me](https://fire-is-the.best)
[Premium](https://gaminggeek.dev/premium)
''')
        embed.set_author(name='Help has arrived', icon_url=str(
            ctx.me.avatar_url_as(static_format='png', size=2048)))
        await ctx.send(embed=embed)


def setup(bot):
    bot.old_help = bot.remove_command("help")
    bot.add_cog(Help(bot))


def teardown(bot):
    bot.add_command(bot.old_help)
