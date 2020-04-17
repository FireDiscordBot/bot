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
from core.fire import Fire
import discord
import aiohttp
import asyncio
import asyncpg
import logging
import json
import os


async def get_pre(bot, message):
    if isinstance(message.channel, discord.DMChannel):
        if bot.dev:
            return commands.when_mentioned_or('$', 'dev ', 'Dev ', '')(bot, message)
        return commands.when_mentioned_or('$', 'fire ', 'Fire ', '')(bot, message)
    if message.guild.id not in bot.configs:
        if bot.dev:
            return commands.when_mentioned_or('$', 'dev ', 'Dev ')(bot, message)
        return commands.when_mentioned_or('$', 'fire ', 'Fire ')(bot, message)
    prefix = bot.configs[message.guild.id].get('main.prefix')
    if bot.dev:
            return commands.when_mentioned_or(prefix, 'dev ', 'Dev ')(bot, message)
    return commands.when_mentioned_or(prefix, 'fire ', 'Fire ')(bot, message)

dev = False
if os.environ.get("FIREENV", "production") == "dev":
    dev = True
bot = Fire(
    command_prefix=get_pre,
    status=discord.Status.idle,
    activity=discord.Game(name="with fire | inv.wtf"),
    case_insensitive=True,
    owner_id=287698408855044097,
    max_messages=8000,
    dev=dev
)


extensions = [
    "cogs.misc",
    "cogs.pickle",
    "cogs.ksoft",
    "cogs.skier",
    "cogs.utils",
    "cogs.help",
    "cogs.dbl",
    "cogs.youtube",
    "cogs.settings",
    "cogs.moderation",
    "cogs.premium",
    "cogs.assist",
    "cogs.imagegen",
    "cogs.koding",
    "cogs.conorthedev",
    "api.main"
]

for cog in extensions:
    try:
        bot.logger.info(f'$GREENLoading cog $BLUE{cog}')
        bot.load_extension(cog)
    except Exception as e:
        bot.logger.error(f"$REDError while loading $BLUE{cog}", exc_info=e)


@bot.command(description="Change the prefix for this guild. (For prefixes with a space, surround it in \"\")")
@commands.has_permissions(administrator=True)
@commands.guild_only()
async def prefix(ctx, pfx: str = None):
    if pfx is None:
        return await ctx.error("Missing argument for prefix! (Note: For prefixes with a space, surround it in \"\")")
    if ctx.me.mention in pfx:
        return await ctx.warning(f'{ctx.me.mention} is a global prefix, you can use it anywhere. There\'s no need to set the server prefix to it')
    if len(pfx) > 10:
        return await ctx.warning(f'Short prefixes are usually better. Try setting a prefix that\'s less than 10 characters')
    else:
        await bot.configs[ctx.guild.id].set('main.prefix', pfx)
        await ctx.success(f'Ok, {discord.utils.escape_mentions(ctx.guild.name)}\'s prefix is now {pfx}!')


@bot.check
async def blacklist_check(ctx):
    if ctx.author.id == 287698408855044097:
        return True
    elif ctx.author.id in ctx.bot.plonked:
        return False
    else:
        return True


@bot.check
async def cmdperm_check(ctx):
    if isinstance(ctx.channel, discord.DMChannel):
        return True
    if ctx.bot.isadmin(ctx.author):
        return True
    if ctx.command.name in ctx.bot.configs[ctx.guild.id].get('disabled.commands'):
        if not ctx.author.permissions_in(ctx.channel).manage_messages:
            return False
    if ctx.channel in ctx.bot.configs[ctx.guild.id].get('commands.modonly'):
        if not ctx.author.permissions_in(ctx.channel).manage_messages:
            return False
    if ctx.channel in ctx.bot.configs[ctx.guild.id].get('commands.modonly'):
        if not ctx.author.permissions_in(ctx.channel).manage_guild:
            return False
    return True


async def start_bot():
    try:
        login_data = {
            "user": "postgres",
            "password": bot.config['pgpassword'],
            "database": "fire" if not bot.dev else "dev",
            "host": "127.0.0.1"
        }
        bot.db = await asyncpg.create_pool(**login_data)
        await bot.start(bot.config['token'])
    except KeyboardInterrupt:
        await bot.db.close()
        await bot.logout()

if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(start_bot())
