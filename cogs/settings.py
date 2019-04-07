import discord
from discord.ext import commands
import datetime
import json
import aiosqlite3

print("settings.py has been loaded")

with open('config.json', 'r') as cfg:
	config = json.load(cfg)

def isadmin(ctx):
	"""Checks if the author is an admin"""
	if str(ctx.author.id) not in config['admins']:
		admin = False
	else:
		admin = True
	return admin

class settings(commands.Cog, name="Settings"):
	def __init__(self, bot):
		self.bot = bot

	@commands.group(name='settings', description='Guild Settings', invoke_without_command=True, ignore_extra=False)
	async def gsettings(self, ctx):
		await self.bot.db.execute(f'SELECT * FROM settings WHERE gid = {ctx.guild.id}')
		guildsettings = await self.bot.db.fetchone()
		if guildsettings == None:
			msg = await ctx.send('Settings not found! Generating settings with default values')
			await self.bot.db.execute(f'INSERT INTO settings (\"gid\") VALUES ({ctx.guild.id});')
			await self.bot.conn.commit()
			await self.bot.db.execute(f'SELECT * FROM settings WHERE gid = {ctx.guild.id}')
			guildsettings = await self.bot.db.fetchone()
		logging = guildsettings[1]
		logchan = None
		if logging != 0:
			try:
				logchan = self.bot.get_channel(logging)
			except discord.NotFound:
				await self.bot.db.execute(f'UPDATE settings SET logging = 0 WHERE gid = {ctx.guild.id}')
				await self.bot.conn.commit()
				logging = False
		else:
			logging = False
		globalbans = bool(guildsettings[2])
		welcome = guildsettings[3]
		welcomechan = None
		if welcome != 0:
			try:
				welcomechan = self.bot.get_channel(welcome)
			except discord.NotFound:
				await self.bot.db.execute(f'UPDATE settings SET welcome = 0 WHERE gid = {ctx.guild.id}')
				await self.bot.conn.commit()
				welcome = False
		else:
			welcome = False
		goodbye = guildsettings[4]
		goodbyechan = None
		if goodbye != 0:
			try:
				goodbyechan = self.bot.get_channel(goodbye)
			except discord.NotFound:
				await self.bot.db.execute(f'UPDATE settings SET goodbye = 0 WHERE gid = {ctx.guild.id}')
				await self.bot.conn.commit()
				goodbye = False
		else:
			goodbye = False
		inviteblock = bool(guildsettings[5])
		embed = discord.Embed(title=":gear: Guild Settings", colour=ctx.author.color, url="https://discordapp.com", description="Here's a list of the current guild settings", timestamp=datetime.datetime.now())
		embed.set_author(name=ctx.guild.name, icon_url=ctx.guild.icon_url)
		embed.add_field(name="Logging", value=logchan or logging, inline=False)
		embed.add_field(name="Global Ban Check (KSoft.Si API)", value=globalbans, inline=False)
		embed.add_field(name="Welcome Messages", value=welcomechan or welcome, inline=False)
		embed.add_field(name="Goodbye Messages", value=goodbyechan or goodbye, inline=False)
		embed.add_field(name="Invite Filter", value=inviteblock, inline=False)
		await ctx.send(embed=embed)


		
		


def setup(bot):
	bot.add_cog(settings(bot))