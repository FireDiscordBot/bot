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


from core.config import TypeMismatchError, RestrictedOptionError, InvalidValueError
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
import os


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
        sentryignored = (
            commands.CheckFailure,
            commands.UserInputError,
            commands.CommandOnCooldown,
            commands.BadArgument,
            commands.BadUnionArgument,
            commands.CheckFailure,
            commands.ArgumentParsingError,
            commands.NotOwner
        )
        noperms = (commands.BotMissingPermissions, commands.MissingPermissions, discord.Forbidden)
        saved = error

        if not isinstance(error, noperms) or not isinstance(error, sentryignored):
            userscope = {
                "id": str(ctx.author.id),
                "username": str(ctx.author)
            }
            extra = {
                "guild.name": ctx.guild.name if ctx.guild else 'N/A',
                "guild.id": ctx.guild.id if ctx.guild else 'N/A',
                "channel.name": ctx.channel.name if ctx.guild else 'DM',
                "channel.id": ctx.channel.id if ctx.guild else 'N/A',
                "environment": os.environ.get("FIREENV", "production")
            }
            await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.sentry_exc, error, userscope, 'error', extra))
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
        errorstr = re.sub(r'(?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)', 'BLOCKED URL', errorstr, 0, re.MULTILINE)

        if isinstance(error, noperms):
            return await ctx.error(f'{discord.utils.escape_mentions(discord.utils.escape_markdown(errorstr))}')

        if isinstance(error, KeyError):
            errorstr = f'Key not found: {errorstr}. This is something that should be reported in my support server, discord.gg/mKDWeSA'

        await ctx.error(f'{discord.utils.escape_mentions(discord.utils.escape_markdown(errorstr))}')
        nomsg = (commands.BotMissingPermissions, commands.MissingPermissions, commands.UserInputError, commands.MissingRequiredArgument, commands.TooManyArguments, TypeMismatchError, RestrictedOptionError, InvalidValueError)
        if isinstance(error, nomsg):
            return
        errortb = ''.join(traceback.format_exception(type(error), error, error.__traceback__))
        embed = discord.Embed(colour=ctx.author.color, url="https://http.cat/500", description=f"hi. someone did something and this happened. pls fix now!\n```py\n{errortb}```", timestamp=datetime.datetime.utcnow())
        embed.add_field(name='User', value=f'{ctx.author} ({ctx.author.id})', inline=False)
        embed.add_field(name='Guild', value=f'{ctx.guild} ({ctx.guild.id})', inline=False)
        embed.add_field(name='Message', value=ctx.message.system_content, inline=False)
        embednotb = discord.Embed(colour=ctx.author.color, url="https://http.cat/500", description=f"hi. someone did something and this happened. pls fix now!", timestamp=datetime.datetime.utcnow())
        embednotb.add_field(name='User', value=f'{ctx.author} ({ctx.author.id})', inline=False)
        embednotb.add_field(name='Guild', value=f'{ctx.guild} ({ctx.guild.id})', inline=False)
        embednotb.add_field(name='Message', value=ctx.message.system_content, inline=False)
        me = self.bot.get_user(287698408855044097)
        try:
            await me.send(embed=embed)
        except discord.HTTPException:
            await me.send(embed=embednotb)
            await me.send(f'```py\n{errortb}```')


def setup(bot):
    try:
        bot.add_cog(commandError(bot))
        bot.logger.info(f'$GREENLoaded event $BLUEcommandError!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(
        #     type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while loading event $BLUE"commandError"', exc_info=e)
