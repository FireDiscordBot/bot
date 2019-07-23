import discord
from discord.ext import commands
import datetime
import json
import aiosqlite3
import typing
from fire.invite import findinvite
from fire.youtube import findchannel, findvideo

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
		self.logchannels = {}

	async def loadLogChannels(self):
		self.logchannels = {}
		await self.bot.db.execute('SELECT * FROM settings;')
		settings = await self.bot.db.fetchall()
		for s in settings:
			if s[1] != 0:
				guild = s[10]
				self.logchannels[guild] = {
					"channel": s[1]
				}

	@commands.Cog.listener()
	async def on_ready(self):
		await asyncio.sleep(5)
		await self.loadLogChannels()
		print('Log channels loaded!')

	@commands.command(name='loadlogch', description='Load log channels', hidden=True)
	async def loadlogch(self, ctx):
		'''PFXloadlogch'''
		if await self.bot.is_owner(ctx.author):
			await self.loadLogChannels()
			await ctx.send('Loaded data!')
		else:
			await ctx.send('no.')

	@commands.Cog.listener()
	async def on_message_delete(self, message):
		if message.guild and not message.author.bot:
			logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
			logch = message.guild.get_channel(logid['channel'])
			if logch:
				embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'{message.author.mention} **deleted a message in** {message.channel.mention}\n{message.content}')
				embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
				embed.set_footer(text=f"Author ID: {message.author.id} | Message ID: {message.id} | Channel ID: {message.channel.id}")
				await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_message_edit(self, before, after):
		if before.content == after.content:
			return
		if after.guild and not after.author.bot:
			logid = self.logchannels[after.guild.id] if after.guild.id in self.logchannels else None
			logch = after.guild.get_channel(logid['channel'])
			if logch:
				embed = discord.Embed(color=after.author.color, timestamp=after.created_at, description=f'{after.author.mention} **edited a message in** {after.channel.mention}')
				embed.set_author(name=after.author, icon_url=str(after.author.avatar_url))
				bcontent = before.content [:1020] + (before.content [1020:] and '...')
				acontent = after.content [:1020] + (after.content [1020:] and '...')
				embed.add_field(name='Before', value=bcontent, inline=False)
				embed.add_field(name='After', value=acontent, inline=False)
				embed.set_footer(text=f"Author ID: {after.author.id} | Message ID: {after.id} | Channel ID: {after.channel.id}")
				await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_guild_channel_create(self, channel):
		if channel.guild:
			logid = self.logchannels[channel.guild.id] if channel.guild.id in self.logchannels else None
			logch = channel.guild.get_channel(logid['channel'])
			if logch:
				embed = discord.Embed(color=discord.Color.green(), timestamp=channel.created_at, description=f'**New channel created: #{channel.name}**')
				embed.set_author(name=channel.guild.name, icon_url=str(channel.guild.icon_url))
				embed.set_footer(text=f"Channel ID: {channel.id} | Guild ID: {channel.guild.id}")
				await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_guild_channel_delete(self, channel):
		if channel.guild:
			logid = self.logchannels[channel.guild.id] if channel.guild.id in self.logchannels else None
			logch = channel.guild.get_channel(logid['channel'])
			if logch:
				embed = discord.Embed(color=discord.Color.red(), timestamp=channel.created_at, description=f'**Channel deleted: #{channel.name}**')
				embed.set_author(name=channel.guild.name, icon_url=str(channel.guild.icon_url))
				embed.set_footer(text=f"Channel ID: {channel.id} | Guild ID: {channel.guild.id}")
				await logch.send(embed=embed)

	@commands.Cog.listener()
	async def on_message(self, message):
		code = findinvite(message.content)
		if code:
			invalidinvite = False
			if not message.author.permissions_in(message.channel).manage_messages:
				if message.guild.me.permissions_in(message.channel).manage_messages:
					await message.delete()
			try:
				invite = await self.bot.fetch_invite(url=code)
			except discord.NotFound or discord.HTTPException as e:
				invalidinvite = True
			if message.guild:
				logid = self.logchannels[message.guild.id] if message.guild.id in self.logchannels else None
				logch = message.guild.get_channel(logid['channel'])
				if logch:
					embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**Invite link sent in** {message.channel.mention}')
					embed.set_author(name=message.author, icon_url=str(message.author.avatar_url))
					if invalidinvite:
						embed.add_field(name='Invite Code', value=code, inline=False)
						embed.add_field(name='Valid?', value='false', inline=False)
					elif invite:
						embed.add_field(name='Invite Code', value=code, inline=False)
						embed.add_field(name='Guild', value=f'{invite.guild.name}({invite.guild.id})', inline=False)
						embed.add_field(name='Channel', value=f'#{invite.channel.name}({invite.channel.id})', inline=False)
						embed.add_field(name='Members', value=f'{invite.approximate_member_count} ({invite.approximate_presence_count} active)', inline=False)
					embed.set_footer(text=f"Author ID: {message.author.id}")
					await logch.send(embed=embed)

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
			await self.loadLogChannels()
		else:
			if type(newlog) == int:
				channel = self.bot.get_channel(newlog)
				if channel == None:
					await ctx.send(f'Invalid channel ID provided! Use `0` to disable or provide a valid channel')
					return
				await self.bot.db.execute(f'UPDATE settings SET logging = {newlog} WHERE gid = {ctx.guild.id}')
				await self.bot.conn.commit()
				await self.loadLogChannels()
				await ctx.send(f'Updated logs setting.')
			elif type(newlog) == discord.TextChannel:
				try:
					self.bot.get_channel(newlog.id)
				except discord.NotFound:
					await ctx.send(f'Invalid channel provided! Use `0` to disable or provide a valid channel')
					return
				await self.bot.db.execute(f'UPDATE settings SET logging = {newlog.id} WHERE gid = {ctx.guild.id}')
				await self.bot.conn.commit()
				await self.loadLogChannels()
				await ctx.send(f'Successfully enabled logging in {newlog.mention}', delete_after=5)
			else:
				raise commands.BadArgument('Invalid value provided. Use 0 to disable or provide a channel (name, mention, id) to enable')
		


def setup(bot):
	bot.add_cog(settings(bot))