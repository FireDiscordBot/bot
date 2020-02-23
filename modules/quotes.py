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

from jishaku.models import copy_context_with
# from fire.converters import Message
from discord.ext import commands
import datetime
import discord
import typing
import re


class quotes(commands.Cog, name="Quotes"):
    def __init__(self, bot):
        self.bot = bot

    def quote_embed(self, context_channel, message, user):
        if not message.system_content and message.embeds and message.author.bot:
            embed = message.embeds[0]
        else:
            if message.author not in message.guild.members or message.author.color == discord.Colour.default():
                lines = []
                embed = discord.Embed(timestamp=message.created_at)
                if message.system_content:
                    urlre = r'((?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*(?:\.png|\.jpg|\.gif)))'
                    search = re.search(urlre, message.system_content)
                    if search and not message.attachments:
                        msg = message.system_content.replace(search.group(0), '').split('\n')
                        embed.set_image(url=search.group(0))
                    else:
                        msg = message.system_content.split('\n')
                    for line in msg:
                        if line:
                            lines.append(f'> {line}')
                    if lines:
                        embed.add_field(name='Message', value='\n'.join(lines) or 'null', inline=False)
                embed.add_field(name='Jump URL', value=f'[Click Here]({message.jump_url})', inline=False)
            else:
                embed = discord.Embed(color=message.author.color, timestamp=message.created_at)
                lines = []
                if message.system_content:
                    urlre = r'((?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*(?:\.png|\.jpg|\.gif)))'
                    search = re.search(urlre, message.system_content)
                    if search and not message.attachments:
                        msg = message.system_content.replace(search.group(0), '').split('\n')
                        embed.set_image(url=search.group(0))
                    else:
                        msg = message.system_content.split('\n')
                    for line in msg:
                        if line:
                            lines.append(f'> {line}')
                    if lines:
                        embed.add_field(name='Message', value='\n'.join(lines) or 'null', inline=False)
                embed.add_field(name='Jump URL', value=f'[Click Here]({message.jump_url})', inline=False)
            if message.attachments:
                if message.channel.is_nsfw() and not context_channel.is_nsfw():
                    embed.add_field(name='Attachments', value=':underage: Quoted message is from an NSFW channel.')
                elif len(message.attachments) == 1 and message.attachments[0].url.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.gifv', '.webp', '.bmp')):
                    embed.set_image(url=message.attachments[0].url)
                else:
                    for attachment in message.attachments:
                        embed.add_field(name='Attachment', value='[' + attachment.filename + '](' + attachment.url + ')', inline=False)
            embed.set_author(name=str(message.author), icon_url=str(message.author.avatar_url_as(static_format='png', size=2048)), url='https://discordapp.com/channels/' + str(message.guild.id) + '/' + str(message.channel.id) + '/' + str(message.id))
            if message.channel != context_channel:
                if message.channel.guild != context_channel.guild:
                    embed.set_footer(text=f'Quoted by: {user} | #{message.channel} | {message.channel.guild}')
                else:
                    embed.set_footer(text=f'Quoted by: {user} | #{message.channel}')
            else:
                embed.set_footer(text=f'Quoted by: {user}')
        return embed

    @commands.Cog.listener()
    async def on_message(self, message):
        ctx = await self.bot.get_context(message)
        if ctx.valid:
            return
        if message.guild:
            if not self.bot.configs[message.guild.id].get('utils.autoquote'):
                return
            if message.channel in self.bot.configs[message.guild.id].get('commands.modonly'):
                if not message.author.permissions_in(message.channel).manage_messages:
                    return
            if message.channel in self.bot.configs[message.guild.id].get('commands.adminonly'):
                if not message.author.permissions_in(message.channel).manage_guild:
                    return
            perms = message.guild.me.permissions_in(message.channel)
            if not perms.send_messages or not perms.embed_links or message.author.bot:
                return

            message_regex = r'https?:\/\/(?:(?:ptb|canary)\.)?discordapp\.com\/channels\/\d{15,21}\/\d{15,21}\/\d{15,21}\/?'
            url = re.findall(message_regex, message.content, re.MULTILINE)
            if all(u == url[0] for u in url) and len(url) > 1:  # Checks if it's one url multiple times.
                return
            for u in url:
                alt_ctx = await copy_context_with(ctx, content=self.bot.configs[ctx.guild.id].get('main.prefix') + f'quote {u}')
                if not alt_ctx.valid:
                    return
                await alt_ctx.command.reinvoke(alt_ctx)

    @commands.command(description='Quote a message from an id or url')
    async def quote(self, ctx, message: typing.Union[discord.Message, str] = None):
        if not message:
            return await ctx.error('Please specify a message ID/URL to quote. Use `auto` to toggle auto message quotes.')
        if isinstance(message, str) and message.lower() == 'auto' and ctx.author.guild_permissions.manage_guild:
            current = self.bot.configs[ctx.guild.id].get('utils.autoquote')
            new = await self.bot.configs[ctx.guild.id].set('utils.autoquote', not current)
            return await ctx.success(f'Auto message quoting: {new}')
        if not isinstance(message, discord.Message):
            return

        if message.author.system:
            return await ctx.error(f'Cannot quote messages from system users!')

        guild = message.guild
        if guild != ctx.guild:
            member = guild.get_member(ctx.author.id)
            if not member:
                return  # Don't send an error because auto quoting exists
            if not member.permissions_in(message.channel).read_messages:
                return  # Don't send an error because auto quoting exists
        elif not ctx.author.permissions_in(message.channel).read_messages:
            return  # Don't send an error because auto quoting exists

        if ctx.guild.me.permissions_in(ctx.channel).manage_webhooks:
            existing = [w for w in (await ctx.channel.webhooks()) if w.token]
            if not existing:
                try:
                    avatar = await ctx.guild.me.avatar_url_as(static_format='png').read()
                    existing = [
                        await ctx.channel.create_webhook(
                            name=f'Fire Quotes #{ctx.channel}',
                            avatar=avatar,
                            reason=f'This webhook will be used for quoting messages in #{ctx.channel}'
                        )
                    ]
                except Exception as e:
                    self.bot.logger.error(f'$REDFailed to create webhook for quotes in $BLUE{ctx.channel} ({ctx.guild})', exc_info=e)
                    existing = ['hi i am here to prevent a KeyError']
            if existing and isinstance(existing[0], discord.Webhook):
                try:
                    content = message.content.replace('@!', '@')
                    for m in message.mentions:
                        content = content.replace(m.mention, u'@\u200b' + str(m))
                    content = discord.utils.escape_mentions(content) if message.content else None
                    return await existing[0].send(
                        content=content,
                        username=str(message.author),
                        avatar_url=str(message.author.avatar_url_as(static_format='png')),
                        embeds=message.embeds,
                        files=message.attachments
                    )
                except Exception as e:
                    self.bot.logger.error(f'$REDFailed to use webhook for quotes in $BLUE{ctx.channel} ({ctx.guild})', exc_info=e)
                    pass  # Fallback to normal quoting if webhook fails

        if not message.content and message.embeds and message.author.bot:
            await ctx.send(
                content='Raw embed from ' + str(message.author) + ' in ' + message.channel.mention,
                embed=self.quote_embed(ctx.channel, message, ctx.author)
            )
        else:
            await ctx.send(embed=self.quote_embed(ctx.channel, message, ctx.author))


def setup(bot):
    bot.add_cog(quotes(bot))
    bot.logger.info(f'$GREENLoaded $BLUEQuotes $GREENmodule!')
