import discord
from discord.ext import commands
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip
import aiosqlite3
import functools
import datetime
import asyncio
import json
import os

print("Premium functions have been loaded!")

with open('config.json', 'r') as cfg:
	config = json.load(cfg)

def isadmin(ctx):
	"""Checks if the author is an admin"""
	if str(ctx.author.id) not in config['admins']:
		admin = False
	else:
		admin = True
	return admin

class Premium(commands.Cog, name="Premium Commands"):
	def __init__(self, bot):
		self.bot = bot
		self.loop = bot.loop

	async def cog_check(self, ctx: commands.Context):
		"""
		Local check, makes all commands in this cog premium only
		"""
		if await self.bot.is_owner(ctx.author):
			return True
		await ctx.bot.db.execute(f'SELECT * FROM prefixes WHERE gid = {ctx.guild.id};')
		premium = await ctx.bot.db.fetchone()
		if premium != None:
			return True
		else:
			return False

	def gencrabrave(self, t, filename):
		clip = VideoFileClip("crabtemplate.mp4")
		text = TextClip(t[0], fontsize=48, color='white', font='Verdana')
		text2 = TextClip("____________________", fontsize=48, color='white', font='Verdana')\
			.set_position(("center", 210)).set_duration(15.4)
		text = text.set_position(("center", 200)).set_duration(15.4)
		text3 = TextClip(t[1], fontsize=48, color='white', font='Verdana')\
			.set_position(("center", 270)).set_duration(15.4)

		video = CompositeVideoClip([clip, text.crossfadein(1), text2.crossfadein(1), text3.crossfadein(1)]).set_duration(15.4)

		video.write_videofile(filename, threads=25, preset='superfast', verbose=False)
		clip.close()
		video.close()

	@commands.command(name='crabrave', description='Make a Crab Rave meme!', hidden=True)
	async def crabmeme(self, ctx, *, text: str):
		'''Limited to owner only (for now, it may return) due to this command using like 90% CPU'''
		if not await self.bot.is_owner(ctx.author):
			return
		if not '|' in text:
			raise commands.ArgumentParsingError('Text should be separated by |')
		if not text:
			raise commands.MissingRequiredArgument('You need to provide text for the meme')
		filename = str(ctx.author.id) + '.mp4'
		t = text.upper().replace('| ', '|').split('|')
		if len(t) != 2:
			raise commands.ArgumentParsingError('Text should have 2 sections, separated by |')
		if (not t[0] and not t[0].strip()) or (not t[1] and not t[1].strip()):
			raise commands.ArgumentParsingError('Cannot use an empty string')
		msg = await ctx.send('🦀 Generating Crab Rave 🦀')
		await self.loop.run_in_executor(None, func=functools.partial(self.gencrabrave, t, filename))
		meme = discord.File(filename, 'crab.mp4')
		await msg.delete()
		await ctx.send(file=meme)
		os.remove(filename)


			

def setup(bot):
	bot.add_cog(Premium(bot))