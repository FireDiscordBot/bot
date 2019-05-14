import discord
from discord.ext import commands
import datetime
import json
import aiosqlite3
import typing

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

	@commands.group(name='gsettings', description='Guild Settings [Work In Progress]', invoke_without_command=True, ignore_extra=False)
	async def gsettings(self, ctx):
		'''PFXgsettings [<logs <channel>|another setting <arg>|more settings <arg>]'''
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
		embed = discord.Embed(title=":gear: Guild Settings", colour=ctx.author.color, url="https://discordapp.com", description="Here's a list of the current guild settings", timestamp=datetime.datetime.utcnow())
		embed.set_author(name=ctx.guild.name, icon_url=ctx.guild.icon_url)
		if type(logchan) == discord.TextChannel:
			embed.add_field(name="Logging", value=logchan.mention, inline=False)
		elif logchan == None:
			embed.add_field(name="Logging", value=logging, inline=False)
		embed.add_field(name="Global Ban Check (KSoft.Si API)", value=globalbans, inline=False)
		embed.add_field(name="Welcome Messages", value=welcomechan or welcome, inline=False)
		embed.add_field(name="Goodbye Messages", value=goodbyechan or goodbye, inline=False)
		embed.add_field(name="Invite Filter", value=inviteblock, inline=False)
		await ctx.send(embed=embed)

	@gsettings.command(name='logs', aliases=['logging', 'log'])
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def settings_logs(self, ctx, newlog: typing.Union[discord.TextChannel, int] = None):
		'''PFXgsettings logs <channel>'''
		if newlog == None:
			raise commands.UserInputError('Missing argument! Provide a channel for me to send logs to or 0 to disable logging')
		elif newlog == 0:
			await self.bot.db.execute(f'UPDATE settings SET logging = 0 WHERE gid = {ctx.guild.id}')
			await self.bot.conn.commit()
			await ctx.send(f'Successfully disabled logging in {ctx.guild.name}', delete_after=5)
		else:
			if type(newlog) == int:
				channel = self.bot.get_channel(newlog)
				if channel == None:
					await ctx.send(f'Invalid channel ID provided! Use `0` to disable or provide a valid channel')
					return
				await self.bot.db.execute(f'UPDATE settings SET logging = {newlog} WHERE gid = {ctx.guild.id}')
				await self.bot.conn.commit()
				await ctx.send(f'Updated logs setting.')
			elif type(newlog) == discord.TextChannel:
				try:
					self.bot.get_channel(newlog.id)
				except discord.NotFound:
					await ctx.send(f'Invalid channel provided! Use `0` to disable or provide a valid channel')
					return
				await self.bot.db.execute(f'UPDATE settings SET logging = {newlog.id} WHERE gid = {ctx.guild.id}')
				await self.bot.conn.commit()
				await ctx.send(f'Successfully enabled logging in {newlog.mention}', delete_after=5)
			else:
				raise commands.BadArgument('Invalid value provided. Use 0 to disable or provide a channel (name, mention, id) to enable')
		


def setup(bot):
	bot.add_cog(settings(bot))