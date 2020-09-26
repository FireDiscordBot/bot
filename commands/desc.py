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


class Description(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def set_desc(self, guild: discord.Guild, desc: str = None):
        con = await self.bot.db.acquire()
        async with con.transaction():
            await self.bot.db.execute(
                'UPDATE vanity SET \"description\" = $2 WHERE gid = $1;',
                str(guild.id),
                desc
            )
        await self.bot.db.release(con)
        await self.bot.get_cog('Vanity URLs').request_fetch(reason=f'Guild "{guild}" updated it\'s description.')

    @commands.command(aliases=['desc'])
    @commands.has_permissions(manage_guild=True)
    async def description(self, ctx, *, desc: str = None):
        vanity = await self.bot.db.fetch(
            'SELECT * FROM vanity WHERE gid=$1;',
            str(ctx.guild.id)
        )
        if not vanity:
            return await ctx.error(f'You must set a vanity url with `{ctx.prefix}vanityurl` before you can set a description')
        try:
            await self.set_desc(ctx.guild, desc)
        except Exception:
            return await ctx.error(f'Failed to set guild description.')
        if not desc:
            return await ctx.success(f'Successfully reset guild description!')
        return await ctx.success(f'Successfully set guild description!')


def setup(bot):
    try:
        bot.add_cog(Description(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"desc" $GREENcommand!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while adding command $CYAN"desc"', exc_info=e)
