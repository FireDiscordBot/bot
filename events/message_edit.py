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
from contextlib import suppress
import functools
import asyncio
import discord
import traceback


class MessageEdit(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_message_edit(self, before, after):
        if not after.guild and not (before.content == after.content or after.author.bot):
            ctx = await self.bot.get_context(after)
            return await self.bot.invoke(ctx)
        if not after.guild or isinstance(after.author, discord.User):
            return
        message = after
        excluded = self.bot.get_config(message.guild).get('excluded.filter')
        roleids = [r.id for r in message.author.roles]
        if message.author.id not in excluded and not any(r in excluded for r in roleids) and message.channel.id not in excluded:
            filters = self.bot.get_cog('Filters')
            # with suppress(Exception):
            await filters.run_all(message)
        logch = self.bot.get_config(after.guild).get('log.action')
        if before.content == after.content or after.author.bot:
            return
        if logch:
            embed = discord.Embed(color=after.author.color, timestamp=after.created_at,
                                  description=f'{after.author.mention} **edited a message in** {after.channel.mention}')
            embed.set_author(name=after.author, icon_url=str(
                after.author.avatar_url_as(static_format='png', size=2048)))
            bcontent = before.system_content[:300] + \
                (before.system_content[300:] and '...')
            acontent = after.system_content[:300] + \
                (after.system_content[300:] and '...')
            embed.add_field(name='Before', value=bcontent, inline=False)
            embed.add_field(name='After', value=acontent, inline=False)
            embed.set_footer(
                text=f"Author ID: {after.author.id} | Message ID: {after.id} | Channel ID: {after.channel.id}")
            try:
                await logch.send(embed=embed)
            except Exception:
                pass
        ctx = await self.bot.get_context(after)
        await self.bot.invoke(ctx)


def setup(bot):
    try:
        bot.add_cog(MessageEdit(bot))
        bot.logger.info(f'$GREENLoaded event $CYANMessageEdit!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while loading event $CYAN"MessageEdit"', exc_info=e)
