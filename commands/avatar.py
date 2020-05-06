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
import traceback
import discord


class Avatar(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(aliases=['av'])
    async def avatar(self, ctx, user: UserWithFallback = None):
        if not user:
            user = ctx.author
        if ctx.guild:
            member = ctx.guild.get_member(user.id)
        await ctx.send(embed=discord.Embed(
            color=member.color if member else ctx.author.color
        ).set_image(
            url=str(user.avatar_url_as(static_format='png', size=2048))
        ))


def setup(bot):
    try:
        bot.add_cog(Avatar(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"avatar" $GREENcommand!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding command $CYAN"avatar"', exc_info=e)
