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
import discord


class Skin(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(description='View a player\'s Minecraft skin')
    async def skin(self, ctx, *, ign: str = None):
        if not ign:
            return await ctx.error('You must provide a name!')
        uid = await self.bot.get_cog('Sk1er Discord').name_to_uuid(ign)
        if not uid:
            return await ctx.error('That player does not exist')
        embed = discord.Embed(color=ctx.author.color)
        embed.set_image(url=f'https://visage.surgeplay.com/full/512/{uid}')
        embed.set_footer(text=f'Requested by {ctx.author}', icon_url=str(ctx.author.avatar_url_as(static_format='png', size=2048)))
        await ctx.send(embed=embed)

def setup(bot):
    try:
        bot.add_cog(Skin(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"skin" $GREENcommand!')
    except Exception as e:
        bot.logger.error(f'$REDError while adding command $CYAN"skin"', exc_info=e)
