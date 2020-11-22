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


from fire.converters import Member, UserWithFallback
from discord.ext import commands, tasks, flags
from jishaku.models import copy_context_with
from fire.http import HTTPClient, Route
import aiofiles
import datetime
import aiohttp
import discord
import zipfile
import typing
import json
import uuid
import re
import io


class Sk1er(commands.Cog, name='Sk1er Discord'):
    def __init__(self, bot):
        self.bot = bot
        self.guild = self.bot.get_guild(411619823445999637)
        self.support_guild = self.bot.get_guild(755794954743185438)
        self.support_message_id = 755817441581596783
        self.support_message = None
        self.support_channel = self.support_guild.get_channel(
            755796557692928031)
        self.modcoreheaders = {'secret': bot.config['modcore']}
        self.modconf = json.load(open('mods.json'))
        self.sk1static = HTTPClient(
            "https://static.sk1er.club"
        )
        self.uuidcache = {}

    async def name_to_uuid(self, player: str):
        try:
            self.uuidcache[player]
        except KeyError:
            route = Route(
                'GET',
                f'/users/profiles/minecraft/{player}'
            )
            try:
                profile = await self.bot.http.mojang.request(route)
                if profile:
                    self.uuidcache.update({player: profile['id']})
            except Exception:
                pass  # whatever is using this should check for None
        return self.uuidcache.get(player, None)

    async def cog_check(self, ctx: commands.Context):
        if ctx.guild.id in [self.guild.id, self.support_guild.id]:
            return True
        return False

    @commands.Cog.listener()
    async def on_message(self, message):
        if not message.guild:
            return
        if message.flags.is_crossposted and message.channel.id == 411620555960352787:
            return await self.check_bot_status(message)
        if message.author.bot or isinstance(message.author, discord.User):
            return

    @commands.Cog.listener()
    async def on_message_edit(self, before, after):
        if after.content == '[Original Message Deleted]' and after.guild.id == self.guild.id:
            return await after.delete()
        if after.flags.is_crossposted and after.channel.id == 411620555960352787:
            if before.pinned and not after.pinned:
                return
            embeds = False
            if before.embeds and after.embeds:
                embeds = before.embeds[0].to_dict(
                ) == after.embeds[0].to_dict()
            if before.content != after.content or after.embeds and not embeds:
                return await self.check_bot_status(after)

    @commands.Cog.listener()
    async def on_raw_reaction_add(self, payload: discord.RawReactionActionEvent):
        if payload.event_type != "REACTION_ADD" or payload.message_id != self.support_message_id:
            return
        if not payload.member:  # Should never be true
            return
        try:
            self.support_message = self.support_message or await self.support_channel.fetch_message(self.support_message_id)
            try:
                await self.support_message.remove_reaction(payload.emoji, payload.member)
            except Exception:
                pass
            alt_ctx = None
            if str(payload.emoji) == "🖥️":
                ctx = await self.bot.get_context(self.support_message)
                alt_ctx = await copy_context_with(
                    ctx,
                    author=payload.member,
                    content=ctx.config.get(
                        "main.prefix") + "new General Support",
                    silent=False
                )
                alt_ctx.ticket_override = self.support_guild.get_channel(
                    755795962462732288)
            elif str(payload.emoji) == "💸":
                ctx = await self.bot.get_context(self.support_message)
                alt_ctx = await copy_context_with(
                    ctx,
                    author=payload.member,
                    content=ctx.config.get(
                        "main.prefix") + "new Purchase Support",
                    silent=False
                )
                alt_ctx.ticket_override = self.support_guild.get_channel(
                    755796036198596688)
            elif str(payload.emoji) == "🐛":
                ctx = await self.bot.get_context(self.support_message)
                alt_ctx = await copy_context_with(
                    ctx,
                    author=payload.member,
                    content=ctx.config.get("main.prefix") + "new Bug Report",
                    silent=False
                )
                alt_ctx.ticket_override = self.support_guild.get_channel(
                    755795994855211018)
            if alt_ctx and alt_ctx.command and alt_ctx.invoked_with:
                alt_ctx.silent = True
                await alt_ctx.command.invoke(alt_ctx)
            else:
                raise Exception("alt ctx command == 404")
        except Exception as e:
            self.bot.logger.warn(
                "$YELLOWFailed to make ticket for Sk1er Support", exc_info=e)

    @commands.Cog.listener()
    async def on_ticket_create(self, ctx, ticket, msg):
        try:
            if ctx.guild.id == self.support_guild.id:
                channel = self.support_channel
                overwrites = channel.overwrites
                overwrites.update(
                    {ctx.author: discord.PermissionOverwrite(read_messages=False)})
                await channel.edit(overwrites=overwrites)
                if msg.embeds:
                    embed = msg.embeds[0]
                    embed.description = """
    Please describe your issue in as much detail as possible, videos and screenshots are accepted aswell.

    A member of staff will review your ticket as soon as possible.
    Some tickets, especially those relating to purchases, can only be handled by Sk1er, which may take longer than a typical ticket"""
                    await msg.edit(embed=embed)
                    if not all(len(m.roles) > 1 for m in ticket.members):
                        await ticket.send('<@&755809868056756235>', allowed_mentions=discord.AllowedMentions(roles=True))
        except Exception as e:
            self.bot.logger.warn(
                "$YELLOWon_ticket_create did an oopsie", exc_info=e)

    @commands.Cog.listener()
    async def on_ticket_close(self, ctx, author):
        try:
            if ctx.guild.id == self.support_guild.id:
                channel = self.support_channel
                overwrites = channel.overwrites.copy()
                overwrites.pop(author, "")
                if overwrites != channel.overwrites:
                    await channel.edit(overwrites=overwrites)
        except Exception as e:
            self.bot.logger.warn(
                "$YELLOWon_ticket_close did an oopsie", exc_info=e)

    @commands.command()
    @commands.has_role(504372119589617674)
    async def mods(self, ctx, *, ign: str):
        if ctx.channel.id != 577203509863251989:
            return await ctx.error(f'You must run this command in <#577203509863251989>')
        mid = await self.name_to_uuid(ign)
        if not mid:
            return await ctx.error(f'Player not found')
        route = Route(
            'GET',
            f'/user_mods/{ign}'
        )
        try:
            modlist = await self.bot.http.sk1er.request(route, headers=self.modcoreheaders)
        except Exception as e:
            return await ctx.error(f'Failed to retrieve mods for {ign}')
        [modlist.remove(m) for m in ['mcp', 'forge',
                                     'fml', 'modcore'] if m in modlist]
        [modlist.remove(m)
         for m in modlist if m in self.modconf['blacklisted_mods']]
        if not modlist:
            return await ctx.error(f'No mods found for {ign}')
        embed = discord.Embed(
            color=ctx.author.color,
            timestamp=datetime.datetime.now(datetime.timezone.utc)
        ).set_author(
            name=ign,
            icon_url=f'https://crafatar.com/avatars/{mid}?overlay=true'
        ).add_field(
            name='» Mods',
            value=', '.join(modlist),
            inline=False
        )
        return await ctx.send(embed=embed)


def setup(bot):
    bot.add_cog(Sk1er(bot))
    bot.logger.info(f'$GREENLoaded cog for discord.gg/sk1er!')
