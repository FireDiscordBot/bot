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

from fire.converters import Member, Category
from discord.ext import commands
import datetime
import discord
import asyncio
import random
import uuid
import re
import io


class tickets(commands.Cog, name="Tickets"):
    def __init__(self, bot):
        self.bot = bot
        self.words = open('./words.txt').read().split(' ')

    @commands.group(name='tickets', description='View all the ticket configuration commands', aliases=['ticket'])
    @commands.has_permissions(manage_channels=True)
    async def tickets_group(self, ctx):
        if ctx.invoked_subcommand:
            return
        embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.utcnow(), description='Here are all the ticket configuration commands')
        embed.add_field(
            name=f'{ctx.prefix}ticket category [<category>]',
            value='Set the category were tickets are made. **Setting this enables tickets**'
                  '\nRunning this command without providing a category resets it, therefore disabling tickets',
            inline=False
        )
        embed.add_field(
            name=f'{ctx.prefix}ticket limit <number>',
            value='Limit the number of tickets a user can make, 0 = No Limit',
            inline=False
        )
        embed.add_field(
            name=f'{ctx.prefix}ticket name <name>',
            value='Set the name for tickets. There are many variables available for use in the name',
            inline=False
        )
        embed.set_author(name=str(ctx.author), icon_url=str(ctx.author.avatar_url_as(static_format='png')))
        return await ctx.send(embed=embed)

    @tickets_group.command(name='category', description='Set the category where tickets are made')
    @commands.has_permissions(manage_channels=True)
    async def tickets_category(self, ctx, category: discord.CategoryChannel = None):
        await self.bot.configs[ctx.guild.id].set('tickets.parent', category)
        if not category:
            return await ctx.success(f'Successfully disabled tickets.')
        return await ctx.success(f'Successfully enabled tickets and set the category to {category}.')

    @tickets_group.command(name='limit', description='Set the limit for how many tickets a user can make')
    @commands.has_permissions(manage_channels=True)
    async def tickets_limit(self, ctx, limit: int = 0):
        if limit < 0 or limit > 20:
            return await ctx.error('Invalid limit')
        await self.bot.configs[ctx.guild.id].set('tickets.limit', limit)
        return await ctx.success(f'Successfully set the ticket limit to {limit}')

    @tickets_group.command(name='name', description='Set the name for tickets')
    @commands.has_permissions(manage_channels=True)
    async def tickets_name(self, ctx, name: str):
        if len(name) > 50:
            return await ctx.error('Name is too long, it must be 50 chars or less')
        variables = {
            '{increment}': self.bot.configs[ctx.guild.id].get('tickets.increment'),
            '{name}': ctx.author.name,
            '{id}': ctx.author.id,
            '{word}': random.choice(self.words),
            '{uuid}': str(uuid.uuid4())[:4]
        }
        if not name:
            variables = '\n'.join([f'{k}: {v}' for k, v in variables.items()])
            current = self.bot.configs[ctx.guild.id].get('tickets.name')
            embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.utcnow())
            embed.add_field(name='Variables', value=variables, inline=False)
            return await ctx.send(embed=embed)
        await self.bot.configs[ctx.guild.id].set('tickets.name', name)
        fname = name
        for k, v in variables.items():
            fname = fname.replace(k, str(v))
        return await ctx.success(f'Successfully set the tickets name to {name}\nExample: {fname}')

    @commands.command(name='new', description='Makes a new ticket')
    @commands.bot_has_permissions(manage_channels=True, manage_roles=True)
    async def tickets_new(self, ctx, *, subject: str = "No subject given"):
        creating = await ctx.send('Creating your ticket...')
        config = self.bot.configs[ctx.guild.id]
        parent = config.get('tickets.parent')
        limit = config.get('tickets.limit')
        if not parent:
            return await ctx.error('Tickets are not enabled here')
        if limit and len([c for c in parent.channels if str(ctx.author.id) in str(c.topic)]) > limit:
            return await ctx.error('You have too many tickets open!')
        variables = {
            '{increment}': config.get('tickets.increment'),
            '{name}': ctx.author.name,
            '{id}': ctx.author.id,
            '{word}': random.choice(self.words),
            '{uuid}': str(uuid.uuid4())[:4],
            '{crab}': '🦀'  # crab in the code? nah, crab in the ticket name
        }
        name = config.get('tickets.name')
        for k, v in variables.items():
            name = name.replace(k, str(v)).replace('crab', '🦀')  # asbyth has me putting crabs everywhere
        overwrites = {
            ctx.author: discord.PermissionOverwrite(read_messages=True, send_messages=True),
            ctx.guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True, manage_channels=True, manage_roles=True),
            ctx.guild.default_role: discord.PermissionOverwrite(read_messages=False)
        }
        overwrites.update(parent.overwrites)
        ticket = await parent.create_text_channel(
            name=name[:50],
            overwrites=overwrites,
            topic=f'Ticket created by {ctx.author} ({ctx.author.id}) with subject "{subject}"',
            reason=f'Ticket created by {ctx.author} ({ctx.author.id})'
        )
        embed = discord.Embed(
            title=f'Ticket opened by {ctx.author}',
            timestamp=datetime.datetime.utcnow(),
            color=ctx.author.color
        )
        embed.add_field(name='Subject', value=subject)
        await ticket.send(embed=embed)
        tchannels = [c for c in config.get('tickets.channels') if c]  # Removes any channels that no longer exist.
        tchannels.append(ticket)
        await config.set('tickets.channels', tchannels)
        await config.set('tickets.increment', config.get('tickets.increment') + 1)
        return await creating.edit(content=f'<:check:674359197378281472> Successfully made your ticket, {ticket.mention}')

    @commands.command(name='add', description='Add a user to the current ticket')
    @commands.bot_has_permissions(manage_roles=True)
    async def tickets_add(self, ctx, *, user: Member):
        tchannels = self.bot.configs[ctx.guild.id].get('tickets.channels')
        if ctx.channel not in tchannels:
            return await ctx.error('This command can only be ran in ticket channels!')
        if str(ctx.author.id) not in ctx.channel.topic and not ctx.author.permissions_in(ctx.channel).manage_channels:
            return await ctx.error('You must own this ticket or have `Manage Channels` permission to add users')
        await ctx.channel.set_permissions(user, read_messages=True, send_messages=True)
        return await ctx.success(f'Successfully added {user.mention} to the ticket')

    @commands.command(name='remove', description='Remove a user from the current ticket')
    @commands.bot_has_permissions(manage_roles=True)
    async def tickets_remove(self, ctx, *, user: Member):
        tchannels = self.bot.configs[ctx.guild.id].get('tickets.channels')
        if ctx.channel not in tchannels:
            return await ctx.error('This command can only be ran in ticket channels!')
        if str(ctx.author.id) not in ctx.channel.topic and not ctx.author.permissions_in(ctx.channel).manage_channels:
            return await ctx.error('You must own this ticket or have `Manage Channels` permission to remove users')
        if str(user.id) in ctx.channel.topic:
            return await ctx.error('You cannot remove the ticket author')
        if not user.permissions_in(ctx.channel).read_messages:
            return await ctx.error(f'{user} is not here, so how are you gonna remove them? 🤔')
        if user.permissions_in(ctx.channel).manage_channels:
            return await ctx.error(f'You cannot remove this user')
        await ctx.channel.set_permissions(user, read_messages=False, send_messages=False)
        return await ctx.success(f'Successfully removed {user} from the ticket')

    @commands.command(name='close', description='Closes a ticket, uploads the transcript to action logs channel and sends to the ticket author')
    @commands.bot_has_permissions(manage_roles=True)
    async def tickets_close(self, ctx, *, reason: str = "No Reason Provided"):
        config = self.bot.configs[ctx.guild.id]
        tchannels = config.get('tickets.channels')
        if ctx.channel not in tchannels:
            return await ctx.error('This command can only be ran in ticket channels!')
        if not ctx.author.permissions_in(ctx.channel).manage_channels and not str(ctx.author.id) in str(ctx.channel.topic):
            return await ctx.error('You must own this ticket or have `Manage Channels` permission to close')
        await ctx.error(f'Are you sure you want to close this ticket? Type `close` to confirm')
        try:
            await self.bot.wait_for('message', check=lambda m: m.author == ctx.author and m.channel == ctx.channel and m.content.lower() == 'close', timeout=10)
        except asyncio.TimeoutError:
            return await ctx.error('No response, aborting close.')
        closing = await ctx.send('Closing ticket, this may make take a bit...')
        transcript = []
        async for m in ctx.channel.history(limit=None):
            transcript.append(f'{m.author} ({m.author.id}) at {m.created_at.strftime("%d/%m/%Y @ %I:%M:%S %p")} UTC\n{m.content}')
        transcript.reverse()
        string = io.StringIO('\n\n'.join(transcript))
        author = ctx.author  # If author is not found for some odd reason, fallback to message author for log embed color
        for m in ctx.channel.members:
            if str(m.id) in ctx.channel.topic:  # they do be the ticket author doe
                author = m
                try:
                    await m.send(f'Your ticket in {ctx.guild} was closed for the reason "{reason}". The transcript is below',
                                 file=discord.File(string, filename=f'{ctx.channel}-transcript.txt'))
                except Exception:
                    pass  # no transcript for you, boo hoo :(
        actionlogs = config.get('log.action')
        if actionlogs:
            transcript.append(f'{len(transcript)} total messages, closed by {ctx.author}')
            string = io.StringIO('\n\n'.join(transcript))
            embed = discord.Embed(
                title=f'Ticket {ctx.channel} was closed',
                timestamp=datetime.datetime.utcnow(),
                color=author.color
            )
            embed.add_field(name='Closed by', value=f'{ctx.author} ({ctx.author.id})', inline=False)
            embed.add_field(name='Reason', value=reason, inline=False)
            await actionlogs.send(
                embed=embed,
                file=discord.File(string, filename=f'transcript.txt')
            )
        return await ctx.channel.delete(reason=f'Ticket closed by {ctx.author} for "{reason}"')


def setup(bot):
    bot.add_cog(tickets(bot))
    bot.logger.info(f'$GREENLoaded $CYANTickets $GREENmodule!')
