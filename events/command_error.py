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


from fire.converters import Member, UserWithFallback, TextChannel, Category, Role
from core.config import TypeMismatchError, RestrictedOptionError, InvalidValueError
from discord import Webhook, AsyncWebhookAdapter
from fire.extras import MissingOverride
from fire.filters.invite import replaceinvite
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


class CommandError(commands.Cog):
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
            MissingOverride,
            commands.UserInputError,
            commands.CommandOnCooldown,
            commands.CheckFailure,
            commands.ArgumentParsingError,
            commands.NotOwner,
            RestrictedOptionError
        )
        noperms = (commands.BotMissingPermissions,
                   commands.MissingPermissions, discord.Forbidden, MissingOverride)
        saved = error

        # Allows us to check for original exceptions raised and sent to CommandInvokeError.
        # If nothing is found. We keep the exception passed to on_command_error.
        error = getattr(error, 'original', error)

        # Check for converter errors so that errors aren't too verbose (prevents "python moment")
        if isinstance(error, commands.BadUnionArgument):
            if any(c in error.converters for c in [Member, UserWithFallback]):
                return await ctx.error(f'User not found :(')
            # Don't think I use VoiceChannel for anything
            if any(c in error.converters for c in [TextChannel, Category]):
                return await ctx.error(f'Channel not found :(')
            if Role in error.converters:
                return await ctx.error(f'Role not found')
        if isinstance(error, commands.BadArgument):
            return await ctx.error(str(error))

        # Anything in ignored will return and prevent anything happening.
        if isinstance(error, ignored):
            if 'permission' in str(error):
                pass
            else:
                return

        if isinstance(error, commands.CommandOnCooldown):
            td = datetime.timedelta(seconds=error.retry_after)
            return await ctx.error(f'This command is on cooldown, please wait {humanfriendly.format_timespan(td)}', delete_after=5)

        if isinstance(error, commands.MaxConcurrencyReached):
            # this is an epic gamer feature, perfect for the google command
            return await ctx.error('You must wait for the command to finish before you can run it again!')

        errorstr = replaceinvite(str(error))
        errorstr = re.sub(
            r'(?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)', 'BLOCKED URL', errorstr, 0, re.MULTILINE)

        if ctx.me.permissions_in(ctx.channel).send_messages:
            if isinstance(error, noperms):
                return await ctx.error(f'{discord.utils.escape_markdown(errorstr)}')

            if not self.bot.isadmin(ctx.author):
                await ctx.error(f'{error.__class__.__name__}: {discord.utils.escape_markdown(errorstr)}')
            else:
                tb = ''.join(traceback.format_exception(
                    type(error), error, error.__traceback__, 3))
                await ctx.send(f'```py\n{tb[:1990]}\n```')

        if not isinstance(error, noperms) and not isinstance(error, sentryignored):
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
            self.bot.sentry_exc(error, userscope, 'error', extra)


def setup(bot):
    try:
        bot.add_cog(CommandError(bot))
        bot.logger.info(f'$GREENLoaded event $CYANCommandError!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(
        #     type(e), e, e.__traceback__))
        bot.logger.error(
            f'$REDError while loading event $CYAN"CommandError"', exc_info=e)
