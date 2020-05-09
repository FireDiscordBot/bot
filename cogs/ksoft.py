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

import discord
from discord.ext import commands
import datetime
import json
import ksoftapi
import typing
import random
from jishaku.paginators import WrappedPaginator, PaginatorEmbedInterface
from fire.converters import Member


imgext = ('.png', '.jpg', '.jpeg', '.gif')

class KSoft(commands.Cog, name="KSoft.SI API"):
	def __init__(self, bot):
		self.bot = bot
		self.bot.ksoft = ksoftapi.Client(api_key=bot.config['ksoft'] if not bot.dev else bot.config['ksoftalt'])

	@commands.command(description="Gets a random meme from Reddit")
	async def meme(self, ctx, sub: str = None):
		if sub is None:
			meme = await self.bot.ksoft.random_meme()
		else:
			meme = await self.bot.ksoft.random_reddit(sub)
		if meme.nsfw:
			channel = ctx.message.channel
			if not channel.is_nsfw():
				await ctx.send("The meme I was given was marked as NSFW but this channel is not. Go into an NSFW channel to see NSFW memes", delete_after=5)
				return
			else:
				pass
		if not meme.title:
			return await ctx.error(f'The subreddit **{discord.utils.escape_mentions(discord.utils.escape_markdown(sub))}** couldn\'t be found...')
		embed = discord.Embed(title="Did someone order a spicy meme?", colour=ctx.message.author.color, url=meme.source, timestamp=datetime.datetime.utcnow())		
		embed.set_author(name=f"Requested by {ctx.message.author}", icon_url=str(ctx.message.author.avatar_url_as(static_format='png', size=2048)))
		embed.set_footer(text=f"Memes provided by https://api.ksoft.si")
		embed.add_field(name="Title", value=meme.title, inline=False)
		embed.add_field(name="Subreddit", value=f"[{meme.subreddit}](https://reddit.com/{meme.subreddit})", inline=False)
		embed.add_field(name="Stats", value=f"<:upvote:646857470345478184> {meme.upvotes:,d} | <:downvote:646857487353380867> {meme.downvotes:,d} | 💬 {meme.comments:,d}", inline=False)
		if meme.url:
			if meme.url.endswith(imgext):
				embed.set_image(url=meme.url)
			else:
				embed.add_field(name='Attachment', value=f"[Click Here]({meme.url})")
		else:
			embed.add_field(name='Check it out', value=f'[Click Here]({meme.source})')
		await ctx.send(embed=embed)

	@commands.command(description="Gets a random image from a specified tag", name="image")
	async def randimage(self, ctx, tag: str = None, nsfw: bool = None):
		taglist = await self.bot.ksoft.tags()
		tags = str(taglist).split(', ')
		if tag.lower() == 'false':
			nsfw = False
			tag = random.choice(tags)
		elif tag.lower() == 'true':
			nsfw = True
			tag = random.choice(tags)
		if tag is None:
			tag = random.choice(tags)
			if tag is None:
				tag = 'dog'
		else:
			if tag not in tags:
				await ctx.send('The tag you gave is invalid. Use the imagetags command to see a list of tags you can use.')
				return
		channel = ctx.message.channel
		if not channel.is_nsfw():
			nsfw = False
			if tag == 'hentai_gif':
				tag = 'dog'
			if tag == 'neko':
				tag = 'pepe'
		if nsfw is None:
			nsfw = False
		img = await self.bot.ksoft.random_image(tag = tag, nsfw = nsfw)
		if img.nsfw:
			if not channel.is_nsfw():
				msg = await ctx.send("The image I was given was marked as NSFW but this channel is not. Go into an NSFW channel to see NSFW memes", delete_after=5)
				return
		embed = discord.Embed(title="The randomizer machine returned this image!", colour=ctx.message.author.color, url=img.url, timestamp=datetime.datetime.utcnow())
		embed.set_image(url=img.url)
		embed.set_author(name=f"Requested by {ctx.message.author}", icon_url=str(ctx.message.author.avatar_url_as(static_format='png', size=2048)))
		embed.set_footer(text=f"🏷️ {tag} (https://api.ksoft.si)")
		await ctx.send(embed=embed)

	@commands.command(description="List all available tags", aliases=['imagetag'])
	async def imagetags(self, ctx):
		tags = await self.bot.ksoft.tags()
		if ctx.channel.nsfw:
			nsfwtags = ', '.join(tags.nsfw_tags)
			sfwtags = ', '.join(tags.sfw_tags)
			await ctx.send(f'```Non-NSFW Tags:\n{sfwtags}\n\nNSFW Tags:\n{nsfwtags}```')
		else:
			sfwtags = ', '.join(tags.sfw_tags)
			await ctx.send(f'```Tags:\n{sfwtags}```')

	@commands.command(name='baninfo', description='Check the info of a ban on the KSoft.Si API')
	async def baninfo(self, ctx, bannedboi: int):
		try:
			inf = await self.bot.ksoft.bans_info(bannedboi)
		except ksoftapi.APIError as e:
			embed = discord.Embed(title=f"Ban info for {bannedboi}.", colour=ctx.message.author.color, timestamp=datetime.datetime.utcnow())
			embed.add_field(name='Error', value=e.message, inline=False)
			embed.add_field(name='Code', value=e.code, inline=False)
			return await ctx.send(embed=embed)
		embed = discord.Embed(title=f"Ban info for {bannedboi}.", colour=ctx.message.author.color, timestamp=datetime.datetime.utcnow())
		embed.set_author(name=f"Requested by {ctx.message.author}", icon_url=str(ctx.message.author.avatar_url_as(static_format='png', size=2048)))
		embed.set_footer(text='Ban info from KSoft.Si API (https://api.ksoft.si/)', icon_url='https://cdn.ksoft.si/images/Logo128.png')
		embed.add_field(name='User', value=f'{inf.name}#{inf.discriminator}' if inf.name != 'Unknown' else 'Unknown#0000')
		embed.add_field(name='Mod ID', value=inf.moderator_id)
		embed.add_field(name='Active', value=inf.is_ban_active)
		embed.add_field(name='Appeal Possible', value=inf.can_be_appealed)
		embed.add_field(name='Reason', value=inf.reason, inline=False)
		embed.add_field(name='Proof', value=f'[Click Here]({inf.proof})' if inf.proof != 'https://bans.ksoft.si' else 'None Provided')
		embed.add_field(name='Timestamp', value=inf.timestamp.replace('T', ' ').split('.')[0]) # Amazing date formatting code. I call it the date formatter-inator (yes, I am Dr. Doofenshmirtz)
		if inf.appeal_reason and inf.appeal_date:
			embed.add_field(name='Appeal Reason', value=inf.appeal_reason)
			embed.add_field(name='Appeal Date', value=inf.appeal_date.replace('T', ' ').split('.')[0])
		await ctx.send(embed=embed)

	@commands.command(name='lyrics')
	async def lyrics(self, ctx, *, query: str = None):
		lyrics = None
		if not query:
			return await ctx.error('Missing search query')
		else:
			lyrics = await self.bot.ksoft.lyrics_search(query)
		if not lyrics or len(lyrics.results) < 1:
			return await ctx.error('No lyrics found')
		lyrics = lyrics.results[0]
		paginator = WrappedPaginator(prefix='', suffix='', max_size=1000)
		for line in lyrics.lyrics.split('\n'):
			paginator.add_line(line)
		embed = discord.Embed(color=ctx.author.color, title=f'{lyrics.name} by {lyrics.artist}', url=lyrics.url)
		embed.set_thumbnail(url=lyrics.album_art)
		footer = {'text': 'Powered by KSoft.Si API', 'icon_url': 'https://cdn.ksoft.si/images/Logo128.png'}
		interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed, _footer=footer)
		await interface.send_to(ctx)


def setup(bot):
	bot.add_cog(KSoft(bot))
	bot.logger.info(f'$GREENLoaded KSoft.Si cog!')
