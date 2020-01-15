"""
MIT License
Copyright (c) 2019 GamingGeek

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
from fire.push import pushbullet
from fire import exceptions
import functools
import asyncio
import asyncpg
import discord
import traceback


class guildAdd(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_guild_join(self, guild):
        await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'guilds.join'))
        con = await self.bot.db.acquire()
        async with con.transaction():
            query = 'INSERT INTO settings (\"gid\") VALUES ($1);'
            await self.bot.db.execute(query, guild.id)
        await self.bot.db.release(con)
        print(f"Fire joined a new guild! {guild.name}({guild.id}) with {guild.member_count} members")
        try:
            await pushbullet("note", "Fire joined a new guild!", f"Fire joined {guild.name}({guild.id}) with {guild.member_count} members", f"https://api.gaminggeek.dev/guild/{guild.id}")
        except exceptions.PushError as e:
            print(e)


def setup(bot):
    try:
        bot.add_cog(guildAdd(bot))
    except Exception as e:
        errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        print(f'Error while adding cog "guildAdd";\n{errortb}')
