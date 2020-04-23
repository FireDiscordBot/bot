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


from fire.converters import TextChannel, Member
from discord.ext import commands
import datetime
import discord
import typing
import re


class snipes(commands.Cog, name="Snipes"):
    def __init__(self, bot):
        self.bot = bot
        self.snipes = {}
        self.esnipes = {}

    def snipe_embed(self, context_channel, message, user, edited=False):
        if not message.system_content and message.embeds and message.author.bot:
            return message.embeds[0]
        msg = None
        lines = []
        color = discord.Color.green()
        if message.author.color and message.author.color != discord.Color.default():
            color = message.author.color
        elif user.color and user.color != discord.Color.default():
            color = user.color
        embed = discord.Embed(color=color, timestamp=message.created_at)
        if message.system_content:
            if not (message.channel.is_nsfw() and not context_channel.is_nsfw()):
                urlre = r'((?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*(?:\.png|\.jpg|\.jpeg|\.gif|\.gifv|\.webp)))'
                search = re.search(urlre, message.system_content)
                if search and not message.attachments:
                    msg = message.system_content.replace(search.group(0), '').split('\n')
                    embed.set_image(url=search.group(0))
            if not msg:
                msg = message.system_content.split('\n')
            for line in msg:
                lines.append(f'{line}')
            if lines:
                embed.description = '\n'.join(lines)
        embed.set_author(name=str(message.author), icon_url=str(message.author.avatar_url_as(static_format='png', size=2048)))
        if message.attachments and not edited:
            embed.add_field(name='Attachment(s)', value='\n'.join([attachment.filename for attachment in message.attachments]) + '\n\n__Attachment URLs are invalidated once the message is deleted.__')
        if message.channel != context_channel:
            embed.set_footer(text=f'Sniped by: {user} | in channel: #{message.channel.name}')
        else:
            embed.set_footer(text=f'Sniped by: {user}')
        return embed

    @commands.Cog.listener()
    async def on_guild_remove(self, guild):
        try:
            del self.snipes[guild.id]
        except KeyError:
            pass

    @commands.Cog.listener()
    async def on_guild_channel_delete(self, channel):
        try:
            del self.snipes[channel.guild.id][channel.id]
        except KeyError:
            pass

    @commands.Cog.listener()
    async def on_message_delete(self, message):
        if not message.guild:
            return
        try:
            self.snipes[message.guild.id][message.author.id] = message
        except KeyError:
            self.snipes[message.guild.id] = {message.author.id: message}
        if message.guild and not message.author.bot:
            try:
                self.snipes[message.guild.id][message.channel.id] = message
            except KeyError:
                self.snipes[message.guild.id] = {message.channel.id: message}

    @commands.Cog.listener()
    async def on_message_edit(self, before, after):
        if not before.guild:
            return
        try:
            self.esnipes[before.guild.id][before.author.id] = before
        except KeyError:
            self.esnipes[before.guild.id] = {before.author.id: before}
        if before.guild and not before.author.bot:
            try:
                self.esnipes[before.guild.id][before.channel.id] = before
            except KeyError:
                self.esnipes[before.guild.id] = {before.channel.id: before}

    @commands.command(description='Snipe a deleted or edited message', aliases=['esnipe'])
    async def snipe(self, ctx, *, target: typing.Union[Member, TextChannel] = None):
        if not target:
            target = ctx.channel

        snipetype = self.snipes if ctx.invoked_with == 'snipe' else self.esnipes  # Saves having another 50 lines

        gsnipes = snipetype.get(ctx.guild.id, None)
        if not gsnipes:
            return await ctx.error(f'Nothing to snipe, move along.')
        message = gsnipes.pop(target.id, None)  # A message can now only be sniped once
        if not message:
            return await ctx.error(f'Nothing to snipe for {target}, move along.')

        if ctx.guild.me.permissions_in(ctx.channel).manage_webhooks:
            existing = [w for w in (await ctx.channel.webhooks()) if w.token]
            if not existing:
                try:
                    avatar = await ctx.guild.me.avatar_url_as(static_format='png').read()
                    existing = [
                        await ctx.channel.create_webhook(
                            name=f'Fire Snipes #{ctx.channel}',
                            avatar=avatar,
                            reason=f'This webhook will be used for sniping messages in #{ctx.channel}'
                        )
                    ]
                except Exception as e:
                    self.bot.logger.warn(f'$YELLOWFailed to create webhook for snipes in $CYAN{ctx.channel} ({ctx.guild})', exc_info=e)
                    existing = ['hi i am here to prevent a KeyError']
            if existing and isinstance(existing[0], discord.Webhook):
                try:
                    content = message.content.replace('@!', '@')
                    for m in message.mentions:
                        content = content.replace(m.mention, u'@\u200b' + str(m))
                    content = discord.utils.escape_mentions(content) if message.content else None
                    return await existing[0].send(
                        content=content,
                        username=str(message.author).replace('#0000', ''),
                        avatar_url=str(message.author.avatar_url_as(static_format='png')),
                        embeds=message.embeds
                    )
                except Exception as e:
                    self.bot.logger.warn(f'$YELLOWFailed to use webhook for snipes in $CYAN{ctx.channel} ({ctx.guild})', exc_info=e)
                    pass  # Fallback to normal sniping if webhook fails

        if not message.content and message.embeds and message.author.bot:
            await ctx.send(
                content=f'Raw embed from {message.author} in {message.channel.mention}',
                embed=self.snipe_embed(ctx.channel, message, ctx.author, edited=bool(message.edited_at))
            )
        else:
            await ctx.send(embed=self.snipe_embed(ctx.channel, message, ctx.author, edited=bool(message.edited_at)))


def setup(bot):
    bot.add_cog(snipes(bot))
    bot.logger.info(f'$GREENLoaded $CYANSnipes $GREENmodule!')
