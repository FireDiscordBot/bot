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
from discord.ext import commands
import discord
import asyncio
import typing
import re


class Quotes(commands.Cog, name="Quotes"):
    def __init__(self, bot):
        self.bot = bot
        self.debug = []

    def quote_embed(self, context_channel, message, user):
        if not message.system_content and message.embeds and message.author.bot:
            return message.embeds[0]
        lines = []
        msg = None
        color = discord.Color.green()
        if message.author.color and message.author.color != discord.Color.default():
            color = message.author.color
        elif user.color and user.color != discord.Color.default():
            color = user.color
        embed = discord.Embed(color=color, timestamp=message.created_at)
        if message.system_content:
            urlre = r'((?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*(?:\.png|\.jpg|\.jpeg|\.gif|\.gifv|\.webp)))'
            search = re.search(urlre, message.system_content)
            if search and not message.attachments:
                msg = message.system_content.replace(
                    search.group(0), '').split('\n')
                embed.set_image(url=search.group(0))
            if not msg:
                msg = message.system_content.split('\n')
            for line in msg:
                if line:
                    lines.append(f'{line}')
            if lines:
                embed.description = '\n'.join(lines)
        embed.add_field(
            name='Jump URL', value=f'[Click Here]({message.jump_url})', inline=False)
        if message.attachments:
            if len(message.attachments) == 1 and message.attachments[0].url.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.gifv', '.webp', '.bmp')):
                embed.set_image(url=message.attachments[0].url)
            else:
                for attachment in message.attachments:
                    embed.add_field(
                        name='Attachment', value=f'[{attachment.filename}]({attachment.url})', inline=False)
        embed.set_author(
            name=str(message.author),
            icon_url=str(message.author.avatar_url_as(
                static_format='png', size=2048)),
            url=f'https://discordapp.com/channels/{message.guild.id}/{message.channel.id}/{message.id}'
        )
        if message.channel != context_channel:
            if message.channel.guild != context_channel.guild:
                embed.set_footer(
                    text=f'Quoted by: {user} | #{message.channel} | {message.channel.guild}')
            else:
                embed.set_footer(
                    text=f'Quoted by: {user} | #{message.channel}')
        else:
            embed.set_footer(text=f'Quoted by: {user}')
        return embed

    @commands.Cog.listener()
    async def on_message(self, message):
        ctx = await self.bot.get_context(message)
        if ctx.valid:
            return
        if message.guild and isinstance(message.author, discord.Member):
            if await self.bot.has_ts_bot(message.guild):
                return
            if not self.bot.get_config(message.guild).get('utils.autoquote'):
                return
            perms = message.guild.me.permissions_in(message.channel)
            config = self.bot.get_config(message.guild)
            if not perms.send_messages or not perms.embed_links:
                if message.author.bot or not (perms.manage_webhooks or config.get('utils.quotehooks')):
                    return
            message_regex = r'(?:http(?:s)?)?:\/\/(?:(?:ptb|canary|development)\.)?discord(?:app)?\.com\/channels\/\d{15,21}\/\d{15,21}\/\d{15,21}\/?'
            botquote_regex = r'.{1,25}\s?quote (http(s)?)?:\/\/(?:(?:ptb|canary|development)\.)?discord(?:app)?\.com\/channels'
            botquote = re.findall(
                botquote_regex, message.content, re.MULTILINE)
            if botquote:
                return
            url = re.findall(message_regex, message.content, re.MULTILINE)
            # Checks if it's one url multiple times.
            if all(u == url[0] for u in url) and len(url) > 1:
                return
            for u in url:
                if f'<{u}>' in message.content:
                    continue
                alt_ctx = await copy_context_with(ctx, content=ctx.config.get('main.prefix') + f'quote {u}')
                if alt_ctx.valid:
                    try:
                        await alt_ctx.command.invoke(alt_ctx)
                    except Exception as e:
                        self.bot.dispatch('command_error', alt_ctx, e)
                await asyncio.sleep(.5)

    @commands.command(description='Quote a message from an id or url', aliases=['autoquote'])
    async def quote(self, ctx, message: typing.Union[discord.Message, str] = None):
        if ctx.invoked_with == 'autoquote' and ctx.author.guild_permissions.manage_guild or (message and isinstance(message, str) and message.lower() == 'auto') and ctx.author.guild_permissions.manage_guild:
            current = ctx.config.get('utils.autoquote')
            new = await ctx.config.set('utils.autoquote', not current)
            return await ctx.success(f'Auto message quoting: {new}')
        if not message:
            return await ctx.error('Please specify a message ID/URL to quote. Use `auto` to toggle auto message quotes.')
        if not isinstance(message, discord.Message):
            if ctx.guild.id in self.debug:
                self.bot.logger.warn(
                    f"$YELLOWAttempted to quote non-message in {ctx.guild}/#{ctx.channel}, $CYAN{message}")
            return

        # Prevent quoting from known system users
        if str(message.author) in ['Public Server Updates#0000', 'Discord#0000'] and not self.bot.isadmin(ctx.author):
            return await ctx.error(f'Cannot quote messages from that user!')
        if message.channel.is_nsfw() and not ctx.channel.is_nsfw():
            return await ctx.error(f'Cannot quote from an NSFW channel in a non-NSFW channel')

        if message.guild:
            if 'DISCOVERABLE' not in message.guild.features:
                if message.guild != ctx.guild:
                    member = message.guild.get_member(ctx.author.id)
                    if not member:
                        try:
                            member = await message.guild.fetch_member(ctx.author.id)
                        except Exception:
                            if ctx.guild.id in self.debug:
                                self.bot.logger.warn(
                                    f"$YELLOWAttempted to quote message without a member in the guild")
                            return
                else:
                    member = ctx.author
                if not member.permissions_in(message.channel).read_messages:
                    return
            elif message.channel.overwrites_for(message.guild.default_role).read_messages not in [None, True]:
                member = message.guild.get_member(ctx.author.id)
                if not member:
                    try:
                        member = await message.guild.fetch_member(ctx.author.id)
                    except Exception:
                        if ctx.guild.id in self.debug:
                            self.bot.logger.warn(
                                f"$YELLOWAttempted to quote message without a member in the guild and @everyone disallowed")
                        return
                if not member.permissions_in(message.channel).read_messages:
                    return
        else:
            if hasattr(ctx.channel, 'recipient') and ctx.channel.recipient.id != ctx.author.id:
                if ctx.guild.id in self.debug:
                    self.bot.logger.warn(
                        f"$YELLOWAttempted to quote message from dm that isn't owned by the command author")
                return

        config = ctx.config
        usehooks = config.get('utils.quotehooks')
        if ctx.guild.me.permissions_in(ctx.channel).manage_webhooks and usehooks:
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
                    self.bot.logger.warn(
                        f'$YELLOWFailed to create webhook for quotes in $CYAN{ctx.channel} ({ctx.guild})', exc_info=e)
            if existing and isinstance(existing[0], discord.Webhook):
                try:
                    content = message.content.replace('@!', '@')
                    for m in message.mentions:
                        content = content.replace(
                            m.mention.replace('@!', '@'), u'@\u200b' + str(m))
                    if not message.author.bot:
                        content = content.replace('[', '\[').replace(']', '\]')
                    content = discord.utils.escape_mentions(
                        content) if message.content else None
                    attchurls = '\n\n' + \
                        '\n'.join(
                            [a.url for a in message.attachments if a.size > 8388608])
                    content = content + \
                        attchurls if content and len(
                            content + attchurls) < 2000 else content
                    excluded = [int(e)
                                for e in config._data.get('excluded.filter', [])]
                    roleids = [r.id for r in ctx.author.roles]
                    if content and ctx.author.id not in excluded and not any(r in excluded for r in roleids) and ctx.channel.id not in excluded:
                        content = self.bot.get_cog(
                            "Filters").run_replace(content, ctx.guild)
                    return await existing[0].send(
                        content=content,
                        username=str(message.author).replace('#0000', ''),
                        avatar_url=str(message.author.avatar_url_as(
                            static_format='png')),
                        embeds=[
                            e for e in message.embeds if 'url' not in e.to_dict()],
                        files=[(await a.to_file()) for a in message.attachments if a.size < 8388608]
                    )
                except Exception as e:
                    self.bot.logger.warn(
                        f'$YELLOWFailed to use webhook for quotes in $CYAN{ctx.channel} ({ctx.guild})', exc_info=e)
                    pass  # Fallback to normal quoting if webhook fails

        if not message.content and message.embeds and message.author.bot:
            await ctx.send(
                content=f'Raw embed from {message.author} in {message.channel.mention}',
                embed=self.quote_embed(ctx.channel, message, ctx.author)
            )
        else:
            await ctx.send(embed=self.quote_embed(ctx.channel, message, ctx.author))


def setup(bot):
    bot.add_cog(Quotes(bot))
    bot.logger.info(f'$GREENLoaded $CYANQuotes $GREENmodule!')
