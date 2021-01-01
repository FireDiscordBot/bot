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

from jishaku.paginators import WrappedPaginator, PaginatorEmbedInterface
from discord.ext import commands
import discord
import datetime
import ksoftapi


imgext = ('.png', '.jpg', '.jpeg', '.gif')


class KSoft(commands.Cog, name="KSoft.SI API"):
    def __init__(self, bot):
        self.bot = bot
        self.ksoft = ksoftapi.Client(
            api_key=bot.config['ksoft'] if not bot.dev else bot.config['ksoftalt'])
        self.bot.ksoft = self.ksoft

    @commands.command(description="Gets a random meme from Reddit")
    async def meme(self, ctx, sub: str = None):
        try:
            if sub is None:
                meme = await self.ksoft.images.random_meme()
            else:
                meme = await self.ksoft.images.random_reddit(sub)
        except ksoftapi.APIError as e:
            return await ctx.error(str(e))
        if meme.nsfw:
            channel = ctx.message.channel
            if not channel.is_nsfw():
                await ctx.send("The meme I was given was marked as NSFW but this channel is not. Go into an NSFW channel to see NSFW memes", delete_after=5)
                return
        if not meme.title:
            return await ctx.error(f'The subreddit **{discord.utils.escape_markdown(sub)}** couldn\'t be found...')
        embed = discord.Embed(title="Did someone order a spicy meme?", colour=ctx.message.author.color,
                              url=meme.source, timestamp=datetime.datetime.now(datetime.timezone.utc))
        embed.set_author(name=f"Requested by {ctx.message.author}", icon_url=str(
            ctx.message.author.avatar_url_as(static_format='png', size=2048)))
        embed.set_footer(text=f"Memes provided by https://api.ksoft.si")
        embed.add_field(name="Title", value=meme.title, inline=False)
        embed.add_field(
            name="Subreddit", value=f"[{meme.subreddit}](https://reddit.com/{meme.subreddit})", inline=False)
        embed.add_field(
            name="Stats", value=f"<:upvote:646857470345478184> {meme.upvotes:,d} | <:downvote:646857487353380867> {meme.downvotes:,d} | 💬 {meme.comments:,d}", inline=False)
        if meme.image_url:
            if meme.image_url.endswith(imgext):
                embed.set_image(url=meme.image_url)
            else:
                embed.add_field(name='Attachment',
                                value=f"[Click Here]({meme.image_url})")
        else:
            embed.add_field(name='Check it out',
                            value=f'[Click Here]({meme.source})')
        await ctx.send(embed=embed)

    @commands.command(name='lyrics')
    async def lyrics(self, ctx, *, query: str = None):
        lyrics = None
        if not query:
            return await ctx.error('Missing search query')
        else:
            try:
                lyrics = await self.ksoft.music.lyrics(query)
            except ksoftapi.NoResults:
                return await ctx.error("No lyrics found")
        if not lyrics or len(lyrics) < 1:
            return await ctx.error('No lyrics found')
        lyrics = lyrics[0]
        paginator = WrappedPaginator(prefix='', suffix='', max_size=1000)
        for line in lyrics.lyrics.split('\n'):
            paginator.add_line(line)
        embed = discord.Embed(
            color=ctx.author.color, title=f'{lyrics.name} by {lyrics.artist}', url=lyrics.url)
        embed.set_thumbnail(url=lyrics.album_art)
        footer = {'text': 'Powered by KSoft.Si API',
                  'icon_url': 'https://cdn.ksoft.si/images/Logo128.png'}
        interface = PaginatorEmbedInterface(
            ctx.bot, paginator, owner=ctx.author, _embed=embed, _footer=footer)
        await interface.send_to(ctx)


def setup(bot):
    bot.add_cog(KSoft(bot))
    bot.logger.info(f'$GREENLoaded KSoft.Si cog!')
