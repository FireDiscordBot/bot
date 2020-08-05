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

# 🦀

import discord
from fire.converters import User, UserWithFallback, Member, TextChannel, VoiceChannel, Category, Role
from jishaku.paginators import PaginatorInterface, PaginatorEmbedInterface, WrappedPaginator
from discord import Webhook, AsyncWebhookAdapter
from discord.ext import commands, flags, tasks
from jishaku.models import copy_context_with
import datetime
import json
import time
import os
import typing
import re
import asyncpg
import asyncio
import aiohttp
import humanfriendly
import traceback
from colormap import rgb2hex, hex2rgb
from emoji import UNICODE_EMOJI


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


def parseTime(content, replace: bool = False):
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
        self.bot.ishoisted = self.ishoisted
        self.tags = {}
        self.reminders = {}
        self.bot.loop.create_task(self.loadtags())
        self.bot.loop.create_task(self.loadremind())
        self.remindcheck.start()

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

    def ishoisted(self, string: str):
        if string.lower()[0] < '0':
            return True
        else:
            return False

    async def loadtags(self):
        await self.bot.wait_until_ready()
        self.bot.logger.info(f'$YELLOWLoading tags...')
        self.tags = {}
        query = 'SELECT * FROM tags;'
        taglist = await self.bot.db.fetch(query)
        for t in taglist:
            guild = t['gid']
            tagname = t['name'].lower()
            content = t['content']
            if guild not in self.tags:
                self.tags[guild] = {}
            self.tags[guild][tagname] = content
        self.bot.logger.info(f'$GREENLoaded tags!')

    async def loadremind(self):
        await self.bot.wait_until_ready()
        self.bot.logger.info(f'$YELLOWLoading reminders...')
        self.reminders = {}
        query = 'SELECT * FROM remind;'
        reminders = await self.bot.db.fetch(query)
        for r in reminders:
            user = r['uid']
            forwhen = r['forwhen']
            reminder = r['reminder']
            if user not in self.reminders:
                self.reminders[user] = []
            self.reminders[user].append({'for': forwhen, 'reminder': reminder})
        self.bot.logger.info(f'$GREENLoaded reminders!')

    async def deleteremind(self, uid: int, forwhen: int):
        con = await self.bot.db.acquire()
        async with con.transaction():
            query = 'DELETE FROM remind WHERE uid = $1 AND forwhen = $2;'
            await self.bot.db.execute(query, uid, forwhen)
        await self.bot.db.release(con)
        await self.loadremind()

    def cog_unload(self):
        self.remindcheck.cancel()

    @tasks.loop(minutes=1)
    async def remindcheck(self):
        reminders = self.reminders.copy()
        fornow = datetime.datetime.now(datetime.timezone.utc).timestamp()
        try:
            for u in reminders:
                user = self.reminders[u]
                for r in user:
                    reminder = r['reminder']
                    if r['for'] <= fornow:
                        quotes = []
                        # When the client switches to discord.com, this go bye bye ok
                        reminder = reminder.replace(
                            'discordapp.com', 'discord.com')
                        if 'discord.com/channels/' in reminder:
                            for i in reminder.split():
                                word = i.lower()
                                urlbranch = None
                                if word.startswith('https://canary.discord.com/channels/'):
                                    urlbranch = 'canary.'
                                    word = word.strip(
                                        'https://canary.discord.com/channels/')
                                elif word.startswith('https://ptb.discord.com/channels/'):
                                    urlbranch = 'ptb.'
                                    word = word.strip(
                                        'https://ptb.discord.com/channels/')
                                elif word.startswith('https://discord.com/channels/'):
                                    urlbranch = ''
                                    word = word.strip(
                                        'https://discord.com/channels/')
                                else:
                                    continue
                                list_ids = word.split('/')
                                if len(list_ids) == 3 and urlbranch is not None:
                                    try:
                                        message = await self.bot.http.get_message(list_ids[1], list_ids[2])
                                        channel = self.bot.get_channel(
                                            int(message["channel_id"]))
                                        if isinstance(channel, discord.TextChannel):
                                            m = channel.guild.get_member(u)
                                            if not m:
                                                pass
                                            if m.permissions_in(channel).read_messages:
                                                fullurl = f'https://{urlbranch}discord.com/channels/{list_ids[0]}/{list_ids[1]}/{list_ids[2]}'
                                                reminder = reminder.replace(
                                                    f'{fullurl}/', '').replace(fullurl, '').replace('<>', '')
                                                quotes.append(f'"{message["content"]}" (<{fullurl}>)'.replace(
                                                    f'{message["content"]}/', message["content"]))
                                    except Exception as e:
                                        if isinstance(e, discord.HTTPException):
                                            pass
                                        else:
                                            self.bot.logger.warn(
                                                f'$YELLOWSomething went wrong when trying to remind someone', exc_info=e)
                                            # print('\n'.join(traceback.format_exception(type(e), e, e.__traceback__)))
                        tosend = self.bot.get_user(u)
                        await self.deleteremind(u, r['for'])
                        try:
                            if quotes:
                                if len(quotes) == 1:
                                    quotes = f'You also quoted {quotes[0]}'
                                else:
                                    quotes = 'You also quoted these messages...\n' + \
                                        '\n'.join(quotes)
                                await tosend.send(f'You wanted me to remind you about "{reminder}"\n\n{quotes}')
                            else:
                                await tosend.send(f'You wanted me to remind you about "{reminder}"')
                        except discord.Forbidden:
                            continue  # How sad, no reminder for you.
                        except Exception as e:
                            self.bot.logger.warn(
                                f'$YELLOWTried to send reminder to {tosend} but an exception occured (and no, it wasn\'t forbidden)', exc_info=e)
                            # print('\n'.join(traceback.format_exception(type(e), e, e.__traceback__)))
        except Exception as e:
            self.bot.logger.warn(
                f'$YELLOWSomething went wrong in the reminder check', exc_info=e)
            # print('\n'.join(traceback.format_exception(type(e), e, e.__traceback__)))

    # @commands.Cog.listener()
    # async def on_ready(self):
    # 	await asyncio.sleep(5)
    # 	await self.loadvanitys()
    # 	await self.loadtags()
    # 	await self.loaddescs()
    # 	await self.loadremind()
    # 	print('Utilities loaded!')

    @commands.command(name='plonk', description='Add someone to the blacklist', hidden=True)
    async def blacklist_add(self, ctx, user: UserWithFallback = None, reason: str = 'bad boi', permanent: bool = False):
        if not self.bot.isadmin(ctx.author):
            return
        if user is None:
            await ctx.send('You need to provide a user to add to the blacklist!')
        else:
            if user.id not in self.bot.plonked:
                permanent = int(permanent)
                # await self.bot.db.execute(f'INSERT INTO blacklist (\"user\", \"uid\", \"reason\", \"perm\") VALUES (\"{user}\", {user.id}, \"{reason}\", {permanent});')
                # await self.bot.conn.commit()
                con = await self.bot.db.acquire()
                async with con.transaction():
                    query = 'INSERT INTO blacklist ("user", uid, reason, perm) VALUES ($1, $2, $3, $4);'
                    await self.bot.db.execute(query, user.name, user.id, reason, permanent)
                await self.bot.db.release(con)
                star_chat = self.bot.get_channel(624304772333436928)
                await star_chat.send(f'{user} was blacklisted by {ctx.author} with the reason "{reason}". Permanent: {bool(permanent)}')
                await ctx.send(f'{user.mention} was successfully blacklisted!')
            else:
                permanent = int(permanent)
                # await self.bot.db.execute(f'UPDATE blacklist SET user = \"{user}\", uid = {user.id}, reason = \"{reason}\", perm = {permanent} WHERE id = {blid};')
                # await self.bot.conn.commit()
                con = await self.bot.db.acquire()
                async with con.transaction():
                    query = 'UPDATE blacklist SET user=$1, uid=$2, reason=$3, perm=$4 WHERE uid=$5;'
                    await self.bot.db.execute(query, user.name, user.id, reason, permanent, blid)
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
                # await self.bot.db.execute(f'DELETE FROM blacklist WHERE uid = {user.id};')
                # await self.bot.conn.commit()
                con = await self.bot.db.acquire()
                async with con.transaction():
                    query = 'DELETE FROM blacklist WHERE uid = $1;'
                    await self.bot.db.execute(query, user.id)
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
        if parseTime(reminder):
            days, hours, minutes, seconds = parseTime(reminder)
            reminder = parseTime(reminder, True)
            if not reminder.replace(' ', '') or not reminder:
                return await ctx.error('Invalid format. Please provide a reminder along with the time')
        else:
            return await ctx.error('Invalid format. Please use the format "DAYSd HOURSh MINUTESm SECONDSs" along with your reminder')
        if not days and not hours and not minutes and not seconds:
            return await ctx.error('Invalid format. Please provide a time')
        if not days and not hours and not minutes and seconds < 120:
            return await ctx.error('If you need a bot to remind you about something in less than two minutes you should *probably* be worried...')
        try:
            forwhen = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
                days=days, seconds=seconds, minutes=minutes, hours=hours)
        except OverflowError:
            return await ctx.error(f'Somehow I don\'t think Discord is gonna be around for that long. Reminders are limited to 3 months anyways')
        limit = datetime.datetime.now(
            datetime.timezone.utc) + datetime.timedelta(days=90)
        if forwhen > limit and not await self.bot.is_owner(ctx.author):
            return await ctx.error('Reminders currently cannot be set for more than 3 months (90 days)')
        if ctx.author.id not in self.reminders:
            try:
                await ctx.author.send('Hey, I\'m just checking to see if I can DM you as this is where I will send your reminder :)')
            except discord.Forbidden:
                return await ctx.error('I was unable to DM you.\nI send reminders in DMs so you must make sure "Allow direct messages from server members." is enabled in at least one mutual server')
        reminder = reminder.strip()
        con = await self.bot.db.acquire()
        async with con.transaction():
            query = 'INSERT INTO remind (\"uid\", \"forwhen\", \"reminder\") VALUES ($1, $2, $3);'
            await self.bot.db.execute(query, ctx.author.id, forwhen.timestamp(), reminder)
        await self.bot.db.release(con)
        await self.loadremind()
        return await ctx.success(f'Reminder set for {humanfriendly.format_timespan(datetime.timedelta(days=days, seconds=seconds, minutes=minutes, hours=hours))} from now')

    @commands.command()
    async def reminders(self, ctx):
        mine = sorted(self.reminders.get(
            ctx.author.id, []), key=lambda r: r['for'])
        if not mine:
            return await ctx.error('You have no reminders.')
        paginator = WrappedPaginator(prefix='', suffix='', max_size=1980)
        for i, r in enumerate(mine):
            forwhen = datetime.datetime.fromtimestamp(
                r['for'], datetime.timezone.utc).strftime('%b %-d %Y @ %I:%M %p')
            delta = humanfriendly.format_timespan(datetime.datetime.fromtimestamp(
                r['for'], datetime.timezone.utc) - datetime.datetime.now(datetime.timezone.utc), max_units=2)
            paginator.add_line(
                f'[{i + 1}] {r["reminder"]} - {forwhen} ({delta})')
        interface = PaginatorEmbedInterface(
            ctx.bot, paginator, owner=ctx.author)
        return await interface.send_to(ctx)

    @commands.command(aliases=['deleteremind', 'delreminder', 'deletereminder'])
    async def delremind(self, ctx, i: int = None):
        mine = sorted(self.reminders.get(
            ctx.author.id, []), key=lambda r: r['for'])
        if not mine:
            return await ctx.error('You have no reminders.')
        if not i:
            return await ctx.error(f'You must specify the reminder to delete. Use the [number] from `{ctx.prefix}reminders` to select a reminder')
        i -= 1  # Arrays start at 0
        if i >= len(mine):
            return await ctx.error(f'You don\'t have that many reminders. Use the [number] from `{ctx.prefix}reminders` to select a reminder')
        r = mine[i]
        forwhen = datetime.datetime.fromtimestamp(
            r['for'], datetime.timezone.utc).strftime('%b %-d %Y @ %I:%M %p')
        delta = humanfriendly.format_timespan(datetime.datetime.fromtimestamp(
            r['for'], datetime.timezone.utc) - datetime.datetime.now(datetime.timezone.utc), max_units=2)
        await self.deleteremind(ctx.author.id, r['for'])
        return await ctx.success(f'Your reminder, "{r["reminder"]}" for {forwhen} ({delta} from now), has been deleted!')

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
                    return await ctx.error(f'No tag called {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))} found.')
                else:
                    if ctx.invoked_with == 'dtag':
                        await ctx.message.delete()
                    await ctx.send(content=discord.utils.escape_mentions(tag))

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
                return await ctx.error(f'No tag called {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))} found.')
            else:
                await ctx.send(content=discord.utils.escape_markdown(discord.utils.escape_mentions(tag)))

    @commands.has_permissions(manage_messages=True)
    @tags.command(name='create', aliases=['new', 'add'])
    async def tagcreate(self, ctx, tagname: str, *, tagcontent: str):
        currenttags = self.tags[ctx.guild.id] if ctx.guild.id in self.tags else [
        ]
        existing = currenttags[tagname] if tagname in currenttags else False
        if existing:
            return await ctx.error(f'A tag with the name {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))} already exists')
        if len(currenttags) >= 20:
            premium_guilds = self.bot.premium_guilds
            if ctx.guild.id not in premium_guilds:
                return await ctx.error(f'You\'ve reached the tag limit! Upgrade to premium for unlimited tags;\n<https://inv.wtf/premium>')
        con = await self.bot.db.acquire()
        async with con.transaction():
            query = 'INSERT INTO tags (\"gid\", \"name\", \"content\") VALUES ($1, $2, $3);'
            await self.bot.db.execute(query, ctx.guild.id, tagname.lower(), tagcontent)
        await self.bot.db.release(con)
        await self.loadtags()
        return await ctx.success(f'Successfully created the tag {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))}')

    @commands.has_permissions(manage_messages=True)
    @tags.command(name='delete', aliases=['del', 'remove'])
    async def tagdelete(self, ctx, tagname: str):
        currenttags = self.tags[ctx.guild.id] if ctx.guild.id in self.tags else [
        ]
        existing = currenttags[tagname.lower(
        )] if tagname.lower() in currenttags else False
        if not existing:
            return await ctx.error(f'A tag with the name {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))} doesn\'t exist')
        con = await self.bot.db.acquire()
        async with con.transaction():
            query = 'DELETE FROM tags WHERE name = $1 AND gid = $2'
            await self.bot.db.execute(query, tagname.lower(), ctx.guild.id)
        await self.bot.db.release(con)
        await self.loadtags()
        return await ctx.success(f'Successfully deleted the tag {discord.utils.escape_mentions(discord.utils.escape_markdown(tagname))}')


def setup(bot):
    bot.add_cog(Utils(bot))
    bot.logger.info(f'$GREENLoaded Utilities cog!')
