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
import datetime
import discord
import asyncio
import asyncpg
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
    prefix = bot.get_config(message.guild).get('main.prefix')
    if bot.dev:
        return commands.when_mentioned_or(prefix, 'dev ', 'Dev ')(bot, message)
    return commands.when_mentioned_or(prefix, 'fire ', 'Fire ')(bot, message)

if os.name != 'nt':
    import uvloop
    uvloop.install()
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

dev = False
if os.environ.get("FIREENV", "production") == "dev":
    dev = True

intents = discord.Intents()
intents.value = 1607

bot = Fire(
    command_prefix=get_pre,
    status=discord.Status.dnd,
    activity=discord.Game("with fire | inv.wtf"),
    intents=intents,
    case_insensitive=True,
    owner_id=287698408855044097,
    max_messages=2500,
    chunk_guilds_at_startup=False,
    member_cache_flags=discord.MemberCacheFlags.none(),
    dev=dev,
    allowed_mentions=discord.AllowedMentions(
        everyone=False, users=False, roles=False)
)


extensions = [
    "cogs.imagegen",
    "cogs.koding",
    "cogs.ksoft",
    "cogs.moderation",
    "cogs.premium",
    "cogs.settings",
    "cogs.utils",
    "cogs.youtube",
    "api.main"
]

for cog in extensions:
    try:
        bot.logger.info(f'$GREENLoading cog $CYAN{cog}')
        bot.load_extension(cog)
    except Exception as e:
        bot.logger.error(f"$REDError while loading $CYAN{cog}", exc_info=e)


@bot.command(description="Change the prefix for this guild. (For prefixes with a space, surround it in \"\")")
@commands.has_permissions(administrator=True)
@commands.guild_only()
async def prefix(ctx, pfx: str = None):
    if not pfx:
        return await ctx.error("Missing argument for prefix! (Note: For prefixes with a space, surround it in \"\")")
    if ctx.me.mention in pfx:
        return await ctx.warning(
            f'{ctx.me.mention} is a global prefix, you can use it anywhere. There\'s no need to set the server prefix to it',
            allowed_mentions=discord.AllowedMentions(users=True)
        )
    if len(pfx) > 10:
        return await ctx.warning(f'Short prefixes are usually better. Try setting a prefix that\'s less than 10 characters')
    else:
        await ctx.config.set('main.prefix', pfx)
        await ctx.success(f'Ok, {ctx.guild.name}\'s prefix is now `{pfx}`!')


@bot.check
async def blacklist_check(ctx):
    if ctx.author.id == 287698408855044097:
        return True
    elif str(ctx.author.id) in bot.plonked:
        return False
    else:
        return True

bot.blacklist_check = blacklist_check


@bot.check
async def cmdperm_check(ctx):
    if ctx.author.bot:
        # somehow bots can trigger auto quotes but not reminders even though it's the same code lol
        return False
    if datetime.datetime.now() - ctx.author.created_at < datetime.timedelta(days=1):
        await ctx.error("Your account has been created too recently!")
        return False
    if isinstance(ctx.channel, discord.DMChannel):
        return True
    if ctx.bot.isadmin(ctx.author):
        return True
    if ctx.channel in ctx.config.get('commands.adminonly'):
        if not ctx.author.permissions_in(ctx.channel).manage_guild:
            return False
    if ctx.command.name in ctx.config.get('disabled.commands'):
        if not ctx.author.permissions_in(ctx.channel).manage_messages:
            return False
    if ctx.channel in ctx.config.get('commands.modonly'):
        if not ctx.author.permissions_in(ctx.channel).manage_messages:
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
        await stop_bot()


async def stop_bot():
    if bot.get_cog('FireStatus') and not bot.dev:
        comps = ['gtbpmn9g33jk', 'xp3103fm3kpf']
        for c in comps:
            await asyncio.sleep(1)  # rate limits are fun
            await bot.get_cog('FireStatus').set_status(c, 'partial_outage')
    await bot.db.close()
    await bot.logout()

if __name__ == "__main__":
    try:
        asyncio.get_event_loop().run_until_complete(start_bot())
    except KeyboardInterrupt:
        asyncio.get_event_loop().run_until_complete(stop_bot())
