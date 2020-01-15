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
from discord.ext.commands import has_permissions, bot_has_permissions
#from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip
from fire.converters import Member, Role, TextChannel
import aiosqlite3
import functools
import datetime
import asyncio
import typing
import asyncpg
import json
import os

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
		self.premiumGuilds  = []
		self.autoroles = {}
		# self.reactroles = {}
		self.joinroles = {}
		self.rolepersists = {}

	async def loadPremiumGuilds(self):
		self.premiumGuilds = []
		query = 'SELECT * FROM premium;'
		guilds = await self.bot.db.fetch(query)
		for guild in guilds:
			self.premiumGuilds.append(guild['gid'])

	async def loadAutoroles(self):
		self.autoroles = {}
		query = 'SELECT * FROM settings;'
		settings = await self.bot.db.fetch(query)
		for s in settings:
			if s['autorole'] != 0:
				guild = s['gid']
				self.autoroles[guild] = {
					"role": s['autorole']
				}

	# async def loadReactroles(self):
	# 	self.reactroles = {}
	# 	query = 'SELECT * FROM settings;'
	# 	settings = await self.bot.db.fetch(query)
	# 	for s in settings:
	# 		if s['reactroleid'] != 0:
	# 			guild = s['gid']
	# 			self.reactroles[guild] = {
	# 				"role": s['reactroleid'],
	# 				"message": s['reactrolemid'],
	# 				"emote": s['reactroleeid']
	# 			}

	async def loadJoinRoles(self):
		self.joinroles = {}
		query = 'SELECT * FROM joinableranks;'
		ranks = await self.bot.db.fetch(query)
		for r in ranks:
			guild = r['gid']
			if guild not in self.joinroles:
				self.joinroles[guild] = []
			self.joinroles[guild].append(r['rid'])

	async def loadRolePersist(self):
		self.rolepersists = {}
		query = 'SELECT * FROM rolepersist;'
		persists = await self.bot.db.fetch(query)
		for p in persists:
			guild = p['gid']
			user = p['uid']
			role = p['rid']
			try:
				self.rolepersists[guild][user] = {
					"role": role
				}
			except KeyError:
				self.rolepersists[guild] = {}
				self.rolepersists[guild][user] = {
					"role": role
				}

	async def cog_check(self, ctx: commands.Context):
		"""
		Local check, makes all commands in this cog premium only
		"""
		if ctx.guild.id in self.premiumGuilds:
			return True
		if await self.bot.is_team_owner(ctx.author):
			return True
		else:
			return False

	async def member_guild_check(self, member: discord.Member):
		return True
		# """
		# Check if the guild from a member is premium
		# """
		# if member.guild.id in self.premiumGuilds:
		# 	return True
		# if await self.bot.is_team_owner(member):
		# 	return True
		# else:
		# 	return False

	@commands.Cog.listener()
	async def on_ready(self):
		await asyncio.sleep(10)
		await self.loadPremiumGuilds()
		await self.loadAutoroles()
		# await self.loadReactroles()
		await self.loadJoinRoles()
		await self.loadRolePersist()
		print('Premium functions loaded!')

	@commands.command(name='loadpremium', description='Load premium data', hidden=True)
	async def loadpremium(self, ctx):
		'''PFXloadpremium'''
		if await self.bot.is_team_owner(ctx.author):
			await self.loadPremiumGuilds()
			await self.loadAutoroles()
			# await self.loadReactroles()
			await self.loadJoinRoles()
			await self.loadRolePersist()
			await ctx.send('<a:fireSuccess:603214443442077708> Loaded data!')
		else:
			await ctx.send('no.')

#	def gencrabrave(self, t, filename):
#		clip = VideoFileClip("crabtemplate.mp4")
#		text = TextClip(t[0], fontsize=48, color='white', font='Verdana')
#		text2 = TextClip("____________________", fontsize=48, color='white', font='Verdana')\
#			.set_position(("center", 210)).set_duration(15.4)
#		text = text.set_position(("center", 200)).set_duration(15.4)
#		text3 = TextClip(t[1], fontsize=48, color='white', font='Verdana')\
#			.set_position(("center", 270)).set_duration(15.4)
#
#		video = CompositeVideoClip([clip, text.crossfadein(1), text2.crossfadein(1), text3.crossfadein(1)]).set_duration(15.4)
#
#		video.write_videofile(filename, preset='superfast', verbose=False)
#		clip.close()
#		video.close()
#
#	@commands.command(name='crabrave', description='Make a Crab Rave meme!', hidden=True)
#	async def crabmeme(self, ctx, *, text: str):
#		'''Limited to owner only (for now, it may return) due to this command using like 90% CPU'''
#		if not await self.bot.is_team_owner(ctx.author):
#			return
#		if not '|' in text:
#			raise commands.ArgumentParsingError('Text should be separated by |')
#		if not text:
#			raise commands.MissingRequiredArgument('You need to provide text for the meme')
#		filename = str(ctx.author.id) + '.mp4'
#		t = text.upper().replace('| ', '|').split('|')
#		if len(t) != 2:
#			raise commands.ArgumentParsingError('Text should have 2 sections, separated by |')
#		if (not t[0] and not t[0].strip()) or (not t[1] and not t[1].strip()):
#			raise commands.ArgumentParsingError('Cannot use an empty string')
#		msg = await ctx.send('🦀 Generating Crab Rave 🦀')
#		await self.loop.run_in_executor(None, func=functools.partial(self.gencrabrave, t, filename))
#		meme = discord.File(filename, 'crab.mp4')
#		await msg.delete()
#		await ctx.send(file=meme)
#		os.remove(filename)

	@commands.command(name='autorole', description='Automatically add a role to a user when they join')
	@has_permissions(manage_roles=True)
	@bot_has_permissions(manage_roles=True)
	@commands.guild_only()
	async def autorole(self, ctx, role: Role = None):
		'''PFXautorole [<role name/id/mention>]\nUse command without role argument to disable'''
		query = 'SELECT * FROM settings WHERE gid = $1;'
		guildsettings = await self.bot.db.fetch(query, ctx.guild.id)
		if guildsettings == []:
			# await self.bot.db.execute(f'INSERT INTO settings (\"gid\") VALUES ({ctx.guild.id});')
			# await self.bot.conn.commit()
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO settings (\"gid\") VALUES ($1);'
				await self.bot.db.execute(query, ctx.guild.id)
			await self.bot.db.release(con)
		if not role:
			# await self.bot.db.execute(f'UPDATE settings SET autorole = 0 WHERE gid = {ctx.guild.id}')
			# await self.bot.conn.commit()
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'UPDATE settings SET autorole = 0 WHERE gid = $1;'
				await self.bot.db.execute(query, ctx.guild.id)
			await self.bot.db.release(con)
			try:
				self.autoroles[ctx.guild.id] = None
			except KeyError:
				pass
			return await ctx.success(f'Successfully disabled auto-role in {discord.utils.escape_mentions(ctx.guild.name)}')
		else:
			roleid = role.id
			# await self.bot.db.execute(f'UPDATE settings SET autorole = {roleid} WHERE gid = {ctx.guild.id}')
			# await self.bot.conn.commit()
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'UPDATE settings SET autorole = $1 WHERE gid = $2'
				await self.bot.db.execute(query, roleid, ctx.guild.id)
			await self.bot.db.release(con)
			self.autoroles[ctx.guild.id] = {
				"role": roleid
			}
			return await ctx.success(f'Successfully enabled auto-role in {discord.utils.escape_mentions(ctx.guild.name)}! All new members will recieve the {discord.utils.escape_mentions(role.name)} role.')

	# @commands.command(name='reactrole', description='Automatically add a role to a user when they react to a message')
	# @has_permissions(manage_roles=True)
	# @bot_has_permissions(manage_roles=True)
	# @commands.guild_only()
	# async def reactrole(self, ctx, role: Role = None, message: int = None, emote: typing.Union[int, str] = None):
	# 	'''PFXautorole [<role name/id/mention> <message id> <emote>]\nUse command without arguments to disable'''
	# 	query = 'SELECT * FROM settings WHERE gid = $1;'
	# 	guildsettings = await self.bot.db.fetch(query, ctx.guild.id)
	# 	if guildsettings == []:
	# 		# await self.bot.db.execute(f'INSERT INTO settings (\"gid\") VALUES ({ctx.guild.id});')
	# 		# await self.bot.conn.commit()
	# 		con = await self.bot.db.acquire()
	# 		async with con.transaction():
	# 			query = 'INSERT INTO settings (\"gid\") VALUES ($1);'
	# 			await self.bot.db.execute(query, ctx.guild.id)
	# 		await self.bot.db.release(con)
	# 	if not role:
	# 		# await self.bot.db.execute(f'UPDATE settings SET (\"reactroleid\", \"reactrolemid\", \"reactroleeid\") = (0, 0, 0) WHERE gid = {ctx.guild.id}')
	# 		# await self.bot.conn.commit()
	# 		con = await self.bot.db.acquire()
	# 		async with con.transaction():
	# 			query = 'UPDATE settings SET (\"reactroleid\", \"reactrolemid\", \"reactroleeid\") = (0, 0, 0) WHERE gid = $1;'
	# 			await self.bot.db.execute(query, ctx.guild.id)
	# 		await self.bot.db.release(con)
	# 		try:
	# 			self.reactroles[ctx.guild.id] = None
	# 		except KeyError:
	# 			pass
	# 		return await ctx.success(f'Successfully disabled reaction role in {discord.utils.escape_mentions(ctx.guild.name)}')
	# 	else:
	# 		try:
	# 			msg = await ctx.channel.fetch_message(message)
	# 		except:
	# 			for channel in ctx.guild.text_channels:
	# 				perms = ctx.guild.me.permissions_in(channel)
	# 				try:
	# 					msg = await channel.fetch_message(message)
	# 				except:
	# 					continue
	# 		if not msg:
	# 			raise commands.ArgumentParsingError('Missing Message ID')
	# 		if not emote:
	# 			raise commands.ArgumentParsingError('Missing Emote')
	# 		roleid = role.id
	# 		messageid = msg.id
	# 		try:
	# 			emote = int(emote)
	# 		except Exception:
	# 			emote = str(emote)
	# 		if type(emote) == int:
	# 			emoteid = discord.utils.get(self.bot.emojis, id=emote)
	# 			if emoteid == None:
	# 				raise commands.ArgumentParsingError('Can\'t find emote from ID.')
	# 			else:
	# 				emote = emoteid
	# 				emoteid = emoteid.id
	# 		elif type(emote) == str:
	# 			emoteid = emote
	# 		# await self.bot.db.execute(f'UPDATE settings SET (\"reactroleid\", \"reactrolemid\", \"reactroleeid\") = ({roleid}, {messageid}, \"{emoteid}\") WHERE gid = {ctx.guild.id}')
	# 		# await self.bot.conn.commit()
	# 		con = await self.bot.db.acquire()
	# 		async with con.transaction():
	# 			query = 'UPDATE settings SET (\"reactroleid\", \"reactrolemid\", \"reactroleeid\") = ($2, $3, $4) WHERE gid = $1;'
	# 			await self.bot.db.execute(query, ctx.guild.id, roleid, messageid, emoteid)
	# 		await self.bot.db.release(con)
	# 		await msg.add_reaction(emote)
	# 		self.reactroles[ctx.guild.id] = {
	# 			"role": roleid,
	# 			"message": messageid,
	# 			"emote": emoteid
	# 		}
	# 		return await ctx.success(f'Successfully enabled reaction role in {discord.utils.escape_mentions(ctx.guild.name)}!')

	@commands.command(name='antiraid', description='Configure the channel for antiraid alerts')
	@commands.has_permissions(manage_channels=True)
	@commands.bot_has_permissions(ban_members=True)
	@commands.guild_only()
	async def antiraid(self, ctx, channel: TextChannel = None):
		if not channel:
			con = await self.bot.db.acquire()
			async with con.transaction():
				mquery = 'UPDATE settings SET antiraid = $1 WHERE gid = $2;'
				await self.bot.db.execute(mquery, 0, ctx.guild.id)
			await self.bot.db.release(con)
			settings = self.bot.get_cog('Settings')
			await settings.loadSettings()
			return await ctx.send(f'I\'ve reset the antiraid alert channel.')
		else:
			con = await self.bot.db.acquire()
			async with con.transaction():
				mquery = 'UPDATE settings SET antiraid = $1 WHERE gid = $2;'
				await self.bot.db.execute(mquery, channel.id, ctx.guild.id)
			await self.bot.db.release(con)
			settings = self.bot.get_cog('Settings')
			await settings.loadSettings()
			return await ctx.send(f'Antiraid alerts will now be sent in {channel.mention}')

	async def _setraidmsg(self, id: int, message: str):
		self.raidmsgs[id] = message
		await asyncio.sleep(300)
		self.raidmsgs[id] = None
		self.bot.dispatch('msgraid_attempt', self.bot.get_guild(id), self.msgraiders[id])

	@commands.command(name='raidmsg', description='Set the raid message for the server. Anyone who says it will get banned')
	@commands.has_permissions(ban_members=True)
	@commands.bot_has_permissions(ban_members=True)
	async def raidmsg(self, ctx, *, msg: str):
		await ctx.message.delete()
		await ctx.send(f'Raid message set! Anyone who sends that message in the next 5 minutes will be added to the list.\nI will alert you in your raid alerts channel with the list of raiders :)')
		asyncio.get_event_loop().create_task(self._setraidmsg(ctx.guild.id, msg))
	
	@commands.command(name='addrank', description='Add a role that users can join through the rank command.')
	@has_permissions(manage_roles=True)
	@bot_has_permissions(manage_roles=True)
	@commands.guild_only()
	async def addrank(self, ctx, *, role: Role):
		'''PFXaddrank <role>'''
		# await self.bot.db.execute(f'INSERT INTO joinableranks (\"gid\", \"rid\") VALUES ({ctx.guild.id}, {role.id});')
		# await self.bot.conn.commit()
		if role.position > ctx.guild.me.top_role.position:
			return await ctx.send('<a:fireFailed:603214400748257302> You cannot add a role that is above my top role.')
		try:
			if role.id in self.joinroles[ctx.guild.id]:
				return await ctx.send('<a:fireFailed:603214400748257302> You cannot add an existing rank.')
		except Exception:
			pass
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'INSERT INTO joinableranks (\"gid\", \"rid\") VALUES ($1, $2);'
			await self.bot.db.execute(query, ctx.guild.id, role.id)
		await self.bot.db.release(con)
		try:
			self.joinroles[ctx.guild.id].append(role.id)
		except KeyError:
			self.joinroles[ctx.guild.id] = []
			self.joinroles[ctx.guild.id].append(role.id)
		await ctx.success(f'Successfully added the rank {discord.utils.escape_mentions(role.name)}!')
		logchannels = self.bot.get_cog("Settings").logchannels
		logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
		if logid:
			logch = ctx.guild.get_channel(logid['modlogs'])
			if logch:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
				embed.set_author(name=f'Rank Added | {role.name}', icon_url=str(ctx.guild.icon_url))
				embed.add_field(name='User', value=ctx.author.mention, inline=False)
				embed.add_field(name='Role', value=f'{role.mention}', inline=False)
				embed.set_footer(text=f'User ID: {ctx.author.id} | Role ID: {role.id}')
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
		return

	@commands.command(name='delrank', description='Remove a rank from the list of joinable roles.')
	@has_permissions(manage_roles=True)
	@bot_has_permissions(manage_roles=True)
	@commands.guild_only()
	async def delrank(self, ctx, *, role: Role):
		'''PFXdelrank <role>'''
		# await self.bot.db.execute(f'DELETE FROM joinableranks WHERE rid = {role.id};')
		# await self.bot.conn.commit()
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM joinableranks WHERE rid = $1;'
			await self.bot.db.execute(query, role.id)
		await self.bot.db.release(con)
		try:
			self.joinroles[ctx.guild.id].remove(role.id) 
		except KeyError:
			pass
		await ctx.success(f'Successfully removed the rank {discord.utils.escape_mentions(role.name)}!')
		logchannels = self.bot.get_cog("Settings").logchannels
		logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
		if logid:
			logch = ctx.guild.get_channel(logid['modlogs'])
			if logch:
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
				embed.set_author(name=f'Rank Removed | {role.name}', icon_url=str(ctx.guild.icon_url))
				embed.add_field(name='User', value=ctx.author.mention, inline=False)
				embed.add_field(name='Role', value=f'{role.mention}', inline=False)
				embed.set_footer(text=f'User ID: {ctx.author.id} | Role ID: {role.id}')
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
		return

	@commands.command(name='rank', description='List all available ranks and join a rank', aliases=['ranks'])
	@bot_has_permissions(manage_roles=True)
	@commands.guild_only()
	async def rank(self, ctx, *, role: Role = None):
		'''PFXrank [<rank>]'''
		if not role:
			try:
				ranks = self.joinroles[ctx.guild.id]
			except KeyError:
				return await ctx.send('<a:fireFailed:603214400748257302> Seems like there\'s no ranks set for this guild :c')
			roles = []
			someremoved = 0
			for rank in ranks:
				role = discord.utils.get(ctx.guild.roles, id=rank)
				if not role:
					# await self.bot.db.execute(f'DELETE FROM joinableranks WHERE rid = {rank};')
					# await self.bot.conn.commit()
					con = await self.bot.db.acquire()
					async with con.transaction():
						query = 'DELETE FROM joinableranks WHERE rid = $1;'
						await self.bot.db.execute(query, rank)
					await self.bot.db.release(con)
					self.joinroles[ctx.guild.id].remove(rank)
					someremoved += 1
				else:
					roles.append(role)
			if roles == []:
				return await ctx.send('<a:fireFailed:603214400748257302> Seems like there\'s no ranks set for this guild :c')
				if someremoved > 0:
					embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
					embed.add_field(name='Error', value=f'I couldn\'t find some of the ranks. This may be due to the corresponding role being deleted.\n{someremoved} rank(s) have been deleted and may need to be re-added.')
					await ctx.send(embed=embed)
			else:
				ranks = []
				for role in roles:
					ranks.append(f'> {role.mention} ({len(role.members)} members)')
				embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.utcnow(), description='\n'.join(ranks))
				embed.set_author(name=f'{ctx.guild.name}\'s ranks', icon_url=str(ctx.guild.icon_url))
				await ctx.send(embed=embed)
		else:
			if not role:
				return await ctx.error(f'I cannot find the rank **{discord.utils.escape_mentions(discord.utils.escape_markdown(role.name))}**. Type \'{ctx.prefix}rank\' to see a list of ranks')
			try:
				if role.id in self.joinroles[ctx.guild.id]:
					if role in ctx.author.roles:
						await ctx.author.remove_roles(role, reason='Left rank')
						await ctx.success(f'You successfully left the {discord.utils.escape_mentions(discord.utils.escape_markdown(role.name))} rank.')
					else:
						await ctx.author.add_roles(role, reason='Joined rank')
						await ctx.success(f'You successfully joined the {discord.utils.escape_mentions(discord.utils.escape_markdown(role.name))} rank.')
				else:
					return await ctx.error(f'I cannot find the rank **{discord.utils.escape_mentions(discord.utils.escape_markdown(role.name))}**. Type \'{ctx.prefix}rank\' to see a list of ranks')
			except KeyError:
				return await ctx.send(f'I cannot find any ranks for this guild :c')

	@commands.command(name='rolepersist', description='Add a role that will stay with the user, even if they leave and rejoin.')
	@has_permissions(manage_roles=True)
	@bot_has_permissions(manage_roles=True)
	@commands.guild_only()
	async def rolepersist(self, ctx, member: Member, *, role: Role):
		'''PFXrolepersist <member> <role>'''
		if ctx.guild.id not in self.rolepersists:
			self.rolepersists[ctx.guild.id] = {}
		if member.id not in self.rolepersists[ctx.guild.id]:
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO rolepersist (\"gid\", \"rid\", \"uid\") VALUES ($1, $2, $3);'
				await self.bot.db.execute(query, ctx.guild.id, role.id, member.id)
			await self.bot.db.release(con)
			try:
				self.rolepersists[ctx.guild.id][member.id] = {
					"role": role.id
				}
			except KeyError:
				self.rolepersists[ctx.guild.id] = {}
				self.rolepersists[ctx.guild.id][member.id] = {
					"role": role.id
				}
			if role not in member.roles:
				try:
					await member.add_roles(role, reason='Role Persist')
				except Exception:
					pass
			await ctx.success(f'**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(member)))}** will keep the role {discord.utils.escape_mentions(discord.utils.escape_markdown(role.name))}')
			logchannels = self.bot.get_cog("Settings").logchannels
			logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
			if logid:
				logch = ctx.guild.get_channel(logid['modlogs'])
				if logch:
					embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
					embed.set_author(name=f'Role Persist | {member}', icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
					embed.add_field(name='User', value=f'{member}({member.id})', inline=False)
					embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
					embed.add_field(name='Role', value=role.mention, inline=False)
					embed.set_footer(text=f'User ID: {member.id} | Mod ID: {ctx.author.id} | Role ID: {role.id}')
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
			return
		else:
			current = self.rolepersists[ctx.guild.id][member.id]['role']
			if role.id != current:
				con = await self.bot.db.acquire()
				async with con.transaction():
					query = 'UPDATE rolepersist SET rid = $1 WHERE gid = $2 AND uid = $3;'
					await self.bot.db.execute(query, role.id, ctx.guild.id, member.id)
				await self.bot.db.release(con)
				self.rolepersists[ctx.guild.id][member.id] = {
					"role": role.id
				}
				try:
					crole = discord.utils.get(ctx.guild.roles, id=current)
					await member.remove_roles(crole, reason='Role Persist')
					await member.add_roles(role, reason='Role Persist Updated')
				except Exception:
					pass
				await ctx.success(f'**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(member)))}** will keep the role {discord.utils.escape_mentions(discord.utils.escape_markdown(role.name))}')
				logchannels = self.bot.get_cog("Settings").logchannels
				logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
				if logid:
					logch = ctx.guild.get_channel(logid['modlogs'])
					if logch:
						embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
						embed.set_author(name=f'Role Persist | {member}', icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
						embed.add_field(name='User', value=f'{member}({member.id})', inline=False)
						embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
						embed.add_field(name='Role', value=role.mention, inline=False)
						embed.set_footer(text=f'User ID: {member.id} | Mod ID: {ctx.author.id} | Role ID: {role.id}')
						try:
							await logch.send(embed=embed)
						except Exception:
							pass
				return
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'DELETE FROM rolepersist WHERE gid = $1 AND uid = $2;'
				await self.bot.db.execute(query, ctx.guild.id, member.id)
			await self.bot.db.release(con)
			try:
				self.rolepersists[ctx.guild.id].pop(member.id, None)
				await member.remove_roles(role, reason='Role Persist')
			except Exception:
				pass
			await ctx.success(f'**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(member)))}** will no longer keep the role {discord.utils.escape_mentions(discord.utils.escape_markdown(role.name))}')
			logchannels = self.bot.get_cog("Settings").logchannels
			logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
			if logid:
				logch = ctx.guild.get_channel(logid['modlogs'])
				if logch:
					embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
					embed.set_author(name=f'Role Persist Removed | {member}', icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
					embed.add_field(name='User', value=f'{member}({member.id})', inline=False)
					embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
					embed.set_footer(text=f'User ID: {member.id} | Mod ID: {ctx.author.id} | Role ID: {role.id}')
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
			return

	# @commands.Cog.listener()
	# async def on_reaction_add(self, reaction, member):
	# 	if type(member) == discord.Member:
	# 		try:
	# 			if await self.member_guild_check(member):
	# 				guild = user.guild
	# 				message = reaction.message
	# 				rr = self.reactroles[guild.id]
	# 				roleid = rr["role"]
	# 				msgid = rr["message"]
	# 				emote = rr["emote"]
	# 				if roleid != None:
	# 					if msgid != None:
	# 						if emote != None:
	# 							emotecheck = None
	# 							try:
	# 								emote = int(emote)
	# 								if emote == reaction.emoji.id:
	# 									emotecheck = True
	# 							except Exception:
	# 								emote = str(emote)
	# 								if emote == reaction.emoji:
	# 									emotecheck = True
	# 							if emotecheck:
	# 								role = discord.utils.get(guild.roles, id=roleid)
	# 								if role != None:
	# 									try:
	# 										await user.add_roles(role, reason='Reaction Role')
	# 									except Exception:
	# 										pass
	# 		except Exception:
	# 			return
	
	# @commands.Cog.listener()
	# async def on_reaction_remove(self, reaction, user):
	# 	if type(user) == discord.Member:
	# 		try:
	# 			if await self.member_guild_check(user):
	# 				guild = user.guild
	# 				message = reaction.message
	# 				rr = self.reactroles[guild.id]
	# 				roleid = rr["role"]
	# 				msgid = rr["message"]
	# 				emote = rr["emote"]
	# 				if roleid != None:
	# 					if msgid != None:
	# 						if emote != None:
	# 							emotecheck = None
	# 							try:
	# 								emote = int(emote)
	# 								if emote == reaction.emoji.id:
	# 									emotecheck = True
	# 							except Exception:
	# 								emote = str(emote)
	# 								if emote == reaction.emoji:
	# 									emotecheck = True
	# 							if emotecheck:
	# 								role = discord.utils.get(guild.roles, id=roleid)
	# 								if role != None:
	# 									try:
	# 										await user.remove_roles(role, reason='Reaction Role')
	# 									except Exception:
	# 										pass
	# 		except Exception:
	# 			return

	@commands.Cog.listener()
	async def on_member_join(self, member):
		if member.guild.id in self.premiumGuilds:
			try:
				roleid = self.autoroles[member.guild.id]["role"]
				role = discord.utils.get(member.guild.roles, id=roleid)
				if role != None:
					await member.add_roles(role, reason='Auto-Role')
			except Exception:
				pass
			try:
				role = self.rolepersists[member.guild.id][member.id]['role']
				r = discord.utils.get(member.guild.roles, id=role)
				if r:
					await member.add_roles(r, reason='Role Persist')
			except Exception as e:
				return
			
	@commands.Cog.listener()
	async def on_member_update(self, before, after):
		broles = []
		aroles = []
		changed = []
		for role in before.roles:
			broles.append(role)
		for role in after.roles:
			aroles.append(role)
		s = set(aroles)
		removed = [x for x in broles if x not in s]
		try:
			role = self.rolepersists[after.guild.id][after.id]['role']
		except KeyError:
			return
		r = discord.utils.get(after.guild.roles, id=role)
		if r in removed:
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'DELETE FROM rolepersist WHERE gid = $1 AND uid = $2;'
				await self.bot.db.execute(query, after.guild.id, after.id)
			await self.bot.db.release(con)
			try:
				self.rolepersists[after.guild.id].pop(after.id, None)
			except Exception:
				pass
			logchannels = self.bot.get_cog("Settings").logchannels
			logid = logchannels[after.guild.id] if after.guild.id in logchannels else None
			if logid:
				logch = after.guild.get_channel(logid['modlogs'])
				if logch:
					embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
					embed.set_author(name=f'Role Persist Removed | {after}', icon_url=str(after.avatar_url_as(static_format='png', size=2048)))
					embed.add_field(name='User', value=f'{after}({after.id})', inline=False)
					embed.add_field(name='Moderator', value=after.guild.me.mention, inline=False)
					embed.set_footer(text=f'User ID: {after.id} | Mod ID: {after.guild.me.id} | Role ID: {r.id}')
					try:
						await logch.send(embed=embed)
					except Exception:
						pass

def setup(bot):
	bot.add_cog(Premium(bot))
