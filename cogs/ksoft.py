import discord
from discord.ext import commands
import datetime
import json
import time
import ksoftapi
import random

print("ksoft.py has been loaded")

with open('config.json', 'r') as cfg:
	config = json.load(cfg)

client = ksoftapi.Client(api_key=config['ksoft'])

def isadmin(ctx):
	"""Checks if the author is an admin"""
	if str(ctx.author.id) not in config['admins']:
		admin = False
	else:
		admin = True
	return admin

imgext = ('.png', '.jpg', '.jpeg', '.gif')

class ksoft(commands.Cog, name="KSoft.SI API"):
	def __init__(self, bot):
		self.bot = bot
		self.bot.ksoft = client

	@commands.command(description="Gets a random meme from Reddit")
	async def meme(self, ctx, sub: str = None):
		"""PFXmeme [<subreddit>]"""
		if sub == None:
			meme = await self.bot.ksoft.random_meme()
		else:
			meme = await self.bot.ksoft.random_reddit(sub)
		if meme.nsfw == True:
			channel = ctx.message.channel
			if channel.is_nsfw() == False:
				msg = await ctx.send("The meme I was given was marked as NSFW but this channel is not. Go into an NSFW channel to see NSFW memes")
				time.sleep(5)
				await msg.delete()
				return
			else:
				pass
		embed = discord.Embed(title="Did someone order a spicy meme?", colour=ctx.message.author.color, url=meme.source, timestamp=datetime.datetime.utcnow())		
		embed.set_author(name=f"Requested by {ctx.message.author}", icon_url=ctx.message.author.avatar_url)
		embed.set_footer(text=f"👍 {meme.upvotes} | 👎 {meme.downvotes} | 💬 {meme.comments} (https://api.ksoft.si)")
		embed.add_field(name="Title", value=meme.title, inline=False)
		embed.add_field(name="Subreddit", value=f"[{meme.subreddit}](https://reddit.com/{meme.subreddit})", inline=False)
		if meme.url.endswith(imgext):
			embed.set_image(url=meme.url)
		else:
			embed.add_field(name='Attachment', value=f"[Click Here]({meme.url})")
		await ctx.send(embed=embed)

	@commands.command(description="Gets a random image from a specified tag", name="image")
	async def randimage(self, ctx, tag: str = None, nsfw: bool = None):
		"""PFXimage [<tag> <nsfw: true/false>]"""
		taglist = await self.bot.ksoft.tags()
		tags = str(taglist).split(', ')
		if tag == 'False':
			nsfw = False
			tag = random.choice(tags)
		elif tag == 'True':
			nsfw = True
			tag = random.choice(tags)
		if tag == None:
			tag = random.choice(tags)
			if tag == None:
				tag = 'dog'
		else:
			if tag not in tags:
				await ctx.send('The tag you gave is invalid. Use the tag command to see a list of tags you can use.')
				return
		channel = ctx.message.channel
		if channel.is_nsfw() == False:
			nsfw = False
			if tag == 'hentai_gif':
				tag = 'dog'
			if tag == 'neko':
				tag = 'pepe'
		if nsfw == None:
			nsfw = False
		img = await self.bot.ksoft.random_image(tag = tag, nsfw = nsfw)
		if img.nsfw == True:
			if channel.is_nsfw() == False:
				msg = await ctx.send("The image I was given was marked as NSFW but this channel is not. Go into an NSFW channel to see NSFW memes", delete_after=5)
				return
		embed = discord.Embed(title="The randomizer machine returned this image!", colour=ctx.message.author.color, url=img.url, timestamp=datetime.datetime.utcnow())
		embed.set_image(url=img.url)
		embed.set_author(name=f"Requested by {ctx.message.author}", icon_url=ctx.message.author.avatar_url)
		embed.set_footer(text=f"🏷️ {tag} (https://api.ksoft.si)")
		await ctx.send(embed=embed)

	@commands.command(description="List all available tags")
	async def tags(self, ctx):
		"""PFXtags"""
		tags = await self.bot.ksoft.tags()
		nsfwtags = ', '.join(tags.nsfw_tags)
		sfwtags = ', '.join(tags.sfw_tags)
		await ctx.send(f'```Non-NSFW Tags:\n{sfwtags}\n\nNSFW Tags:\n{nsfwtags}```')


def setup(bot):
	bot.add_cog(ksoft(bot))