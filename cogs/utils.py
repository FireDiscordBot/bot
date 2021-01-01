"""
MIT License
Copyright (c) 2021 GamingGeek

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

# 🦀

from jishaku.paginators import PaginatorEmbedInterface, WrappedPaginator
from fire.converters import UserWithFallback, Member, Role
from discord.ext import commands, tasks
from emoji import UNICODE_EMOJI
from colormap import rgb2hex
from fuzzywuzzy import fuzz
import humanfriendly
import datetime
import discord
import typing
import re


region = {
    'amsterdam': '🇳🇱 Amsterdam',
    'brazil': '🇧🇷 Brazil',
    'eu-central': '🇪🇺 Central Europe',
    'eu-west': '🇪🇺 Western Europe',
    'europe': '🇪🇺 Europe',
    'frakfurt': '🇩🇪 Frankfurt',
    'hongkong': '🇭🇰 Hong Kong',
    'india': '🇮🇳 India',
    'japan': '🇯🇵 Japan',
    'england': '🇬🇧 England',
    'russia': '🇷🇺 Russia',
    'singapore': '🇸🇬 Singapore',
    'southafrica': '🇿🇦 South Africa',
    'sydney': '🇦🇺 Sydney',
    'us-central': '🇺🇸 Central US',
    'us-south': '🇺🇸 US South',
    'us-east': '🇺🇸 US East',
    'us-west': '🇺🇸 US West',
    'london': 'stop using deprecated regions >:('
}

notifs = {
    'NotificationLevel.all_messages': 'All Messages',
    'NotificationLevel.only_mentions': 'Only Mentions'
}

permissions = {
    'administrator': 'Admin',
    'ban_members': 'Ban',
    'change_nickname': 'Change Nick',
    'kick_members': 'Kick',
    'manage_channels': 'Manage Channels',
    'manage_emojis': 'Manage Emojis',
    'manage_guild': 'Manage Guild',
    'manage_messages': 'Manage Messages',
    'manage_nicknames': 'Manage Nicks',
    'manage_roles': 'Manage Roles',
    'manage_webhooks': 'Manage Webhooks',
    'mention_everyone': 'Mention Everyone',
    'view_audit_log': 'View Logs'
}


month_regex = re.compile(
    r'(?:me in |in )?(?:(?P<months>\d+)(?:mo|months|month| months| month))(?: about | that )?')
week_regex = re.compile(
    r'(?:me in |in )?(?:(?P<weeks>\d+)(?:wk|weeks|week| weeks| week))(?: about | that )?')
day_regex = re.compile(
    r'(?:me in |in )?(?:(?P<days>\d+)(?:d|days|day| days| day))(?: about | that )?')
hour_regex = re.compile(
    r'(?:me in |in )?(?:(?P<hours>\d+)(?:h|hours|hour| hours| hour))(?: about | that )?')
min_regex = re.compile(
    r'(?:me in |in )?(?:(?P<minutes>\d+)(?:m|minutes|minute| minutes| minute))(?: about | that )?')
sec_regex = re.compile(
    r'(?:me in |in )?(?:(?P<seconds>\d+)(?:s|seconds|second| seconds| second))(?: about | that )?')


def parse_time(content, replace: bool = False):
    if replace:
        for regex in [
                r'(?:me in |in )?(?:(?P<months>\d+)(?:mo|months|month| months| month))(?: about | that )?',
                r'(?:me in |in )?(?:(?P<weeks>\d+)(?:wk|weeks|week| weeks| week))(?: about | that )?',
                r'(?:me in |in )?(?:(?P<days>\d+)(?:d|days|day| days| day))(?: about | that )?',
                r'(?:me in |in )?(?:(?P<hours>\d+)(?:h|hours|hour| hours| hour))(?: about | that )?',
                r'(?:me in |in )?(?:(?P<minutes>\d+)(?:m|minutes|minute| minutes| minute))(?: about | that )?',
                r'(?:me in |in )?(?:(?P<seconds>\d+)(?:s|seconds|second| seconds| second))(?: about | that )?'
        ]:
            content = re.sub(regex, '', content, 0, re.MULTILINE)
        return content
    try:
        months = month_regex.search(content)
        weeks = week_regex.search(content)
        days = day_regex.search(content)
        hours = hour_regex.search(content)
        minutes = min_regex.search(content)
        seconds = sec_regex.search(content)
    except Exception:
        return 0, 0, 0, 0
    time = 0
    if months or weeks or days or hours or minutes or seconds:
        months = months.group(1) if months is not None else 0
        weeks = weeks.group(1) if weeks is not None else 0
        days = days.group(1) if days is not None else 0
        hours = hours.group(1) if hours is not None else 0
        minutes = minutes.group(1) if minutes is not None else 0
        seconds = seconds.group(1) if seconds is not None else 0
        days = int(days) if days else 0
        if not days:
            days = 0
        if months:
            days += int(months)*30
        if weeks:
            days += int(weeks)*7
        hours = int(hours) if hours else 0
        if not hours:
            hours = 0
        minutes = int(minutes) if minutes else 0
        if not minutes:
            minutes = 0
        seconds = int(seconds) if seconds else 0
        if not seconds:
            seconds = 0
        return days, hours, minutes, seconds
    return 0, 0, 0, 0


class Utils(commands.Cog, name='Utility Commands'):
    def __init__(self, bot):
        self.bot = bot
        self.bot.is_emoji = self.is_emoji
        self.bot.len_emoji = self.len_emoji
        self.bot.isascii = lambda s: len(s) == len(s.encode())
        self.bot.getperms = self.getperms
        self.bot.getguildperms = self.getguildperms
        self.tags = {}
        self.bot.loop.create_task(self.loadtags())

    def is_emoji(self, s):
        return s in UNICODE_EMOJI

    def len_emoji(self, s):
        count = 0
        for c in s:
            if self.is_emoji(c):
                count += 1
        return count

    def getperms(self, member: discord.Member, channel: typing.Union[discord.TextChannel, discord.VoiceChannel, discord.CategoryChannel]):
        perms = []
        for perm, value in member.permissions_in(channel):
            if value:
                perms.append(perm)
        return perms

    def getguildperms(self, member: discord.Member):
        perms = []
        for perm, value in member.guild_permissions:
            if value:
                perms.append(perm)
        return perms

    async def loadtags(self):
        await self.bot.wait_until_ready()
        self.bot.logger.info(f'$YELLOWLoading tags...')
        self.tags = {}
        query = 'SELECT * FROM tags;'
        taglist = await self.bot.db.fetch(query)
        for t in taglist:
            guild = int(t['gid'])
            tagname = t['name'].lower()
            content = t['content']
            if guild not in self.tags:
                self.tags[guild] = {}
            self.tags[guild][tagname] = content
        self.bot.logger.info(f'$GREENLoaded tags!')

    @commands.command(name='plonk', description='Add someone to the blacklist', hidden=True)
    async def blacklist_add(self, ctx, user: UserWithFallback = None, reason: str = 'bad boi', permanent: bool = False):
        if not self.bot.isadmin(ctx.author):
            return
        if user is None:
            await ctx.send('You need to provide a user to add to the blacklist!')
        else:
            if user.id not in self.bot.plonked:
                permanent = int(permanent)
                con = await self.bot.db.acquire()
                async with con.transaction():
                    query = 'INSERT INTO blacklist ("user", uid, reason, perm) VALUES ($1, $2, $3, $4);'
                    await self.bot.db.execute(query, user.name, str(user.id), reason, permanent)
                await self.bot.db.release(con)
                star_chat = self.bot.get_channel(624304772333436928)
                await star_chat.send(f'{user} was blacklisted by {ctx.author} with the reason "{reason}". Permanent: {bool(permanent)}')
                await ctx.send(f'{user.mention} was successfully blacklisted!')
            else:
                permanent = int(permanent)
                con = await self.bot.db.acquire()
                async with con.transaction():
                    query = 'UPDATE blacklist SET user=$1, uid=$2, reason=$3, perm=$4 WHERE uid=$5;'
                    await self.bot.db.execute(query, user.name, str(user.id), reason, permanent, str(user.id))
                await self.bot.db.release(con)
                star_chat = self.bot.get_channel(624304772333436928)
                await star_chat.send(f'{user}\'s blacklist was updated by {ctx.author} to reason "{reason}". Permanent: {bool(permanent)}')
                await ctx.send(f'Blacklist entry updated for {user.mention}.')
            await self.bot.load_plonked()

    @commands.command(name='unplonk', description='Remove someone from the blacklist', hidden=True)
    async def blacklist_remove(self, ctx, user: UserWithFallback = None):
        if not self.bot.isadmin(ctx.author):
            return
        if user is None:
            await ctx.send('You need to provide a user to remove from the blacklist!')
        else:
            if user.id not in self.bot.plonked:
                return await ctx.send(f'{user.mention} is not blacklisted.')
            else:
                con = await self.bot.db.acquire()
                async with con.transaction():
                    query = 'DELETE FROM blacklist WHERE uid = $1;'
                    await self.bot.db.execute(query, str(user.id))
                await self.bot.db.release(con)
                await ctx.send(f'{user.mention} is now unblacklisted!')
                star_chat = self.bot.get_channel(624304772333436928)
                await star_chat.send(f'{user} was unblacklisted by {ctx.author}')
            await self.bot.load_plonked()

    def shorten(self, items: list, max: int = 1000, sep: str = ', '):
        text = ''
        while len(text) < max and items:
            text = text + f'{items[0]}{sep}'
            items.pop(0)
        if text.endswith(sep):  # Remove trailing separator
            text = text[:(len(text) - len(sep))]
        if len(items) >= 1:
            return text + f' and {len(items)} more...'
        return text

    @commands.group(name='info', invoke_without_command=True)
    @commands.guild_only()
    async def infogroup(self, ctx):
        embed = discord.Embed(
            colour=ctx.author.color, timestamp=datetime.datetime.now(datetime.timezone.utc))
        embed.set_author(name=ctx.guild.name, icon_url=str(ctx.guild.icon_url))
        embed.add_field(name='Info Commands',
                        value=f'> {ctx.prefix}info guild | Get\'s info about the guild\n> {ctx.prefix}info user [<user>] | Get\'s info about you or another user\n> {ctx.prefix}info role [<role>] | Get\'s info about your top role or another role', inline=False)
        await ctx.send(embed=embed)

    @infogroup.command(name='user')
    async def infouser(self, ctx, uinfo: typing.Union[Member, UserWithFallback] = None):
        return await ctx.invoke(self.bot.get_command('user'), uinfo=uinfo)

    @infogroup.command(name='guild')
    async def infoguild(self, ctx):
        return await ctx.invoke(self.bot.get_command('guild'))

    @infogroup.command(description='Check out a role\'s info')
    async def role(self, ctx, *, role: Role = None):
        if not role:
            role = ctx.author.top_role
        embed = discord.Embed(colour=role.color if role.color != discord.Color.default(
        ) else ctx.author.color, timestamp=datetime.datetime.now(datetime.timezone.utc))
        embed.add_field(name="» Name", value=role.name, inline=False)
        embed.add_field(name="» ID", value=role.id, inline=False)
        embed.add_field(name="» Mention",
                        value=f'`{role.mention}`', inline=False)
        rgbcolor = role.color.to_rgb()
        hexcolor = rgb2hex(role.color.r, role.color.g,
                           role.color.b).replace('##', '#')
        embed.add_field(name="» Hoisted?", value='Yes' if role.hoist else 'No')
        embed.add_field(name="» Mentionable?",
                        value='Yes' if role.mentionable else 'No')
        embed.add_field(
            name="» Color", value=f'RGB: {rgbcolor}\nHEX: {hexcolor}')
        perms = []
        if not role.permissions.administrator:
            for perm, value in role.permissions:
                if value and perm in permissions:
                    perms.append(permissions[perm])
            if perms:
                embed.add_field(name="» Key Permissions",
                                value=', '.join(perms), inline=False)
        else:
            embed.add_field(name="» Permissions",
                            value='Administrator', inline=False)
        await ctx.send(embed=embed)
        is_cached = len(ctx.guild.members) / ctx.guild.member_count
        if role.members and is_cached > 0.98:
            paginator = WrappedPaginator(prefix='', suffix='', max_size=250)
            for member in role.members:
                paginator.add_line(member.mention)
            membed = discord.Embed(
                colour=role.color if role.color != discord.Color.default() else ctx.author.color,
                timestamp=datetime.datetime.now(datetime.timezone.utc),
                title=f'Members [{len(role.members):,d}]'
            )
            interface = PaginatorEmbedInterface(
                ctx.bot, paginator, owner=ctx.author, _embed=membed)
            await interface.send_to(ctx)

    @commands.command(aliases=['remind', 'reminder'], description='Sets a reminder for a time in the future')
    async def remindme(self, ctx, *, reminder: str):
        return await ctx.error(
            """This feature has been removed due to terrible code.
You can invite Fire's in development rewrite bot which has this feature (and hopefully no issues) @ https://inv.wtf/tsbot
Note: The separate bot is temporary and the rewrite will be ran on this bot when it is finished!"""
        )

    @commands.command()
    async def reminders(self, ctx):
        return await ctx.error(
            """This feature has been removed due to terrible code.
You can invite Fire's in development rewrite bot which has this feature (and hopefully no issues) @ https://inv.wtf/tsbot
Note: The separate bot is temporary and the rewrite will be ran on this bot when it is finished!"""
        )

    @commands.command(aliases=['deleteremind', 'delreminder', 'deletereminder'])
    async def delremind(self, ctx, i: int = None):
        return await ctx.error(
            """This feature has been removed due to terrible code.
You can invite Fire's in development rewrite bot which has this feature (and hopefully no issues) @ https://inv.wtf/tsbot
Note: The separate bot is temporary and the rewrite will be ran on this bot when it is finished!"""
        )

    def get_fuzzy_tag(self, ctx, arg):
        taglist = self.tags[ctx.guild.id] if ctx.guild.id in self.tags else False
        if not taglist:
            return False
        for tag in taglist:
            for c in [c for c in tag if not ctx.bot.isascii(c)]:
                tag = tag.replace(c, '')
            if fuzz.ratio(arg.strip().lower(), tag.strip().lower()) >= 60:
                return tag
        return False

    @commands.group(name='tags', aliases=['tag', 'dtag'], invoke_without_command=True)
    @commands.guild_only()
    async def tags(self, ctx, *, tagname: str = None):
        if not ctx.invoked_subcommand:
            taglist = self.tags[ctx.guild.id] if ctx.guild.id in self.tags else False
            if not taglist:
                return await ctx.error('No tags found.')
            if not tagname:
                taglist = ', '.join(taglist)
                embed = discord.Embed(
                    title=f'{ctx.guild.name}\'s tags',
                    color=ctx.author.color,
                    description=taglist
                )
                return await ctx.send(embed=embed)
            else:
                tag = taglist[tagname.lower()] if tagname.lower(
                ) in taglist else False
                if not tag:
                    fuzzy = self.get_fuzzy_tag(ctx, tagname)
                    if not fuzzy:
                        return await ctx.error(f'No tag called {discord.utils.escape_markdown(tagname)} found.')
                    tag = taglist[fuzzy]
                if ctx.invoked_with == 'dtag':
                    await ctx.message.delete()
                await ctx.send(content=tag)

    @tags.command(name='raw')
    async def tagraw(self, ctx, *, tagname: str = None):
        taglist = self.tags[ctx.guild.id] if ctx.guild.id in self.tags else False
        if not taglist:
            return await ctx.error('No tags found.')
        if not tagname:
            return await ctx.error(f'No tag provided. Use {ctx.prefix}tags to view all tags')
        else:
            tag = taglist[tagname.lower()] if tagname.lower(
            ) in taglist else False
            if not tag:
                fuzzy = self.get_fuzzy_tag(ctx, tagname)
                if not fuzzy:
                    return await ctx.error(f'No tag called {discord.utils.escape_markdown(tagname)} found.')
                tag = taglist[fuzzy]
            else:
                await ctx.send(content=discord.utils.escape_markdown(tag))

    @commands.has_permissions(manage_messages=True)
    @tags.command(name='create', aliases=['new', 'add'])
    async def tagcreate(self, ctx, tagname: str, *, tagcontent: str):
        currenttags = self.tags[ctx.guild.id] if ctx.guild.id in self.tags else [
        ]
        existing = currenttags[tagname] if tagname in currenttags else False
        if existing:
            return await ctx.error(f'A tag with the name {discord.utils.escape_markdown(tagname)} already exists')
        if len(currenttags) >= 20:
            premium_guilds = self.bot.premium_guilds
            if ctx.guild.id not in premium_guilds:
                return await ctx.error(f'You\'ve reached the tag limit! Upgrade to premium for unlimited tags;\n<https://inv.wtf/premium>')
        con = await self.bot.db.acquire()
        async with con.transaction():
            query = 'INSERT INTO tags (\"gid\", \"name\", \"content\") VALUES ($1, $2, $3);'
            await self.bot.db.execute(query, str(ctx.guild.id), tagname.lower(), tagcontent)
        await self.bot.db.release(con)
        await self.loadtags()
        return await ctx.success(f'Successfully created the tag {discord.utils.escape_markdown(tagname)}')

    @commands.has_permissions(manage_messages=True)
    @tags.command(name='delete', aliases=['del', 'remove'])
    async def tagdelete(self, ctx, tagname: str):
        currenttags = self.tags[ctx.guild.id] if ctx.guild.id in self.tags else [
        ]
        existing = currenttags[tagname.lower(
        )] if tagname.lower() in currenttags else False
        if not existing:
            return await ctx.error(f'A tag with the name {discord.utils.escape_markdown(tagname)} doesn\'t exist')
        con = await self.bot.db.acquire()
        async with con.transaction():
            query = 'DELETE FROM tags WHERE name = $1 AND gid = $2'
            await self.bot.db.execute(query, tagname.lower(), str(ctx.guild.id))
        await self.bot.db.release(con)
        await self.loadtags()
        return await ctx.success(f'Successfully deleted the tag {discord.utils.escape_markdown(tagname)}')


def setup(bot):
    bot.add_cog(Utils(bot))
    bot.logger.info(f'$GREENLoaded Utilities cog!')
