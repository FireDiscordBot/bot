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

from discord import Webhook, AsyncWebhookAdapter
from fire.invite import replaceinvite
from core.context import Context
from discord.ext import commands
import humanfriendly
import functools
import traceback
import datetime
import discord
import aiohttp
import random
import re


class commandError(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_command_error(self, ctx: Context, error):

        # This prevents any commands with local handlers
        # being handled here in on_command_error.
        if hasattr(ctx.command, 'on_error'):
            return

        if isinstance(error, commands.CommandNotFound):
            return

        ignored = (commands.CheckFailure)
        sentryignored = (commands.CheckFailure)
        noperms = (commands.BotMissingPermissions, commands.MissingPermissions, discord.Forbidden)
        saved = error

        if not isinstance(error, noperms):
            userscope = {
                "id": str(ctx.author.id),
                "username": str(ctx.author)
            }
            extra = {
                "guild.name": ctx.guild.name if ctx.guild else 'N/A',
                "guild.id": ctx.guild.id if ctx.guild else 'N/A',
                "server_name": "Fire"
            }
            if isinstance(error, sentryignored):
                exclevel = 'warning'
            elif isinstance(error, commands.CommandOnCooldown):
                exclevel = 'info'
            else:
                exclevel = 'error'
            await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.sentry_exc, error, userscope, exclevel, extra))
        # Allows us to check for original exceptions raised and sent to CommandInvokeError.
        # If nothing is found. We keep the exception passed to on_command_error.
        error = getattr(error, 'original', error)

        # Anything in ignored will return and prevent anything happening.
        if isinstance(error, ignored):
            if 'permission' in str(error):
                pass
            else:
                return

        if isinstance(error, commands.CommandOnCooldown):
            td = datetime.timedelta(seconds=error.retry_after)
            return await ctx.error(f'This command is on cooldown, please wait {humanfriendly.format_timespan(td)}', delete_after=5)

        errorstr = replaceinvite(str(error))
        if 'http://' in str(error) or 'https://' in str(error):
            errorstr = re.sub(r'(?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)', 'BLOCKED URL', str(error), 0, re.MULTILINE)

        if isinstance(error, noperms):
            return await ctx.error(f'{discord.utils.escape_mentions(discord.utils.escape_markdown(errorstr))}')

        if isinstance(error, KeyError):
            errorstr = f'Key not found: {errorstr}. This is something that should be reported in my support server, discord.gg/mKDWeSA'

        await ctx.error(f'{discord.utils.escape_mentions(discord.utils.escape_markdown(errorstr))}')
        nomsg = (commands.BotMissingPermissions, commands.MissingPermissions, commands.UserInputError, commands.MissingRequiredArgument, commands.TooManyArguments)
        if isinstance(error, nomsg):
            return
        errortb = ''.join(traceback.format_exception(type(error), error, error.__traceback__))
        embed = discord.Embed(colour=ctx.author.color, url="https://http.cat/500", description=f"hi. someone did something and this happened. pls fix now!\n```py\n{errortb}```", timestamp=datetime.datetime.utcnow())
        embed.add_field(name='User', value=ctx.author, inline=False)
        embed.add_field(name='Guild', value=ctx.guild, inline=False)
        embed.add_field(name='Message', value=ctx.message.system_content, inline=False)
        embednotb = discord.Embed(colour=ctx.author.color, url="https://http.cat/500", description=f"hi. someone did something and this happened. pls fix now!", timestamp=datetime.datetime.utcnow())
        embednotb.add_field(name='User', value=ctx.author, inline=False)
        embednotb.add_field(name='Guild', value=ctx.guild, inline=False)
        embednotb.add_field(name='Message', value=ctx.message.system_content, inline=False)
        me = self.bot.get_user(287698408855044097)
        try:
            await me.send(embed=embed)
        except discord.HTTPException:
            await me.send(embed=embednotb)
            await me.send(f'```py\n{errortb}```')
        time = datetime.datetime.utcnow().strftime('%d/%b/%Y:%H:%M:%S')
        guild = ctx.guild or 'None'
        gid = ctx.guild.id if guild != 'None' else 0
        message = f'```ini\n[Command Error Logger]\n\n[User] {ctx.author}({ctx.author.id})\n[Guild] {guild}({gid})\n[Message] {ctx.message.system_content}\n[Time] {time}\n\n[Traceback]\n{errortb}```'
        messagenotb = f'```ini\n[Command Error Logger]\n\n[User] {ctx.author}({ctx.author.id})\n[Guild] {guild}({gid}))\n[Message] {ctx.message.system_content}\n[Time] {time}```'
        tbmessage = f'```ini\n[Traceback]\n{errortb}```'
        async with aiohttp.ClientSession() as session:
            webhook = Webhook.from_url(self.bot.config['logwebhook'], adapter=AsyncWebhookAdapter(session))
            try:
                await webhook.send(message, username='Command Error Logger')
            except discord.HTTPException:
                await webhook.send(messagenotb, username='Command Error Logger')
                await webhook.send(tbmessage, username='Command Error Logger')


def setup(bot):
    try:
        bot.add_cog(commandError(bot))
        bot.logger.info(f'$GREENLoaded event $BLUEcommandError!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(
        #     type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while loading event $BLUE"commandError"', exc_info=e)
