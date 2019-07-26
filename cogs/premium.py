import discord
from discord.ext import commands
from discord.ext.commands import has_permissions, bot_has_permissions
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip
import aiosqlite3
import functools
import datetime
import asyncio
import typing
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
		self.bot: commands.Bot = bot
		self.loop = bot.loop
		self.premiumGuilds  = []
		self.autoroles = {}
		self.reactroles = {}
		self.joinroles = {}

	async def loadPremiumGuilds(self):
		self.premiumGuilds = []
		await self.bot.db.execute('SELECT * FROM premium;')
		guilds = await self.bot.db.fetchall()
		for guild in guilds:
			self.premiumGuilds.append(guild[1])

	async def loadAutoroles(self):
		self.autoroles = {}
		await self.bot.db.execute('SELECT * FROM settings;')
		settings = await self.bot.db.fetchall()
		for s in settings:
			if s[6] != 0:
				guild = s[10]
				self.autoroles[guild] = {
					"role": s[6]
				}

	async def loadReactroles(self):
		self.reactroles = {}
		await self.bot.db.execute('SELECT * FROM SETTINGS;')
		settings = await self.bot.db.fetchall()
		for s in settings:
			if s[7] != 0:
				guild = s[10]
				self.reactroles[guild] = {
					"role": s[7],
					"message": s[8],
					"emote": s[9]
				}

	async def loadJoinRoles(self):
		self.joinroles = {}
		await self.bot.db.execute('SELECT * FROM joinableranks;')
		ranks = await self.bot.db.fetchall()
		for r in ranks:
			if r[0] != None:
				guild = r[1]
				self.joinroles[guild] = []
				self.joinroles[guild].append(r[2])

	async def cog_check(self, ctx: commands.Context):
		"""
		Local check, makes all commands in this cog premium only
		"""
		if await self.bot.is_owner(ctx.author):
			return True
		if ctx.guild.id in self.premiumGuilds:
			return True
		else:
			return False

	async def member_guild_check(self, member: discord.Member):
		"""
		Check if the guild from a member is premium
		"""
		if await self.bot.is_owner(member):
			return True
		if member.guild.id in self.premiumGuilds:
			return True
		else:
			return False

	@commands.Cog.listener()
	async def on_ready(self):
		await asyncio.sleep(10)
		await self.loadPremiumGuilds()
		await self.loadAutoroles()
		await self.loadReactroles()
		await self.loadJoinRoles()
		print('Premium functions loaded!')

	@commands.command(name='loadpremium', description='Load premium data', hidden=True)
	async def loadpremium(self, ctx):
		'''PFXloadpremium'''
		if await self.bot.is_owner(ctx.author):
			await self.loadPremiumGuilds()
			await self.loadAutoroles()
			await self.loadReactroles()
			await self.loadJoinRoles()
			await ctx.send('Loaded data!')
		else:
			await ctx.send('no.')

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

	@commands.command(name='autorole', description='Automatically add a role to a user when they join')
	async def autorole(self, ctx, role: discord.Role = None):
		'''PFXautorole [<role name/id/mention>]\nUse command without role argument to disable'''
		await self.bot.db.execute(f'SELECT * FROM settings WHERE gid = {ctx.guild.id}')
		guildsettings = await self.bot.db.fetchone()
		if guildsettings == None:
			await self.bot.db.execute(f'INSERT INTO settings (\"gid\") VALUES ({ctx.guild.id});')
			await self.bot.conn.commit()
		if not role:
			await self.bot.db.execute(f'UPDATE settings SET autorole = 0 WHERE gid = {ctx.guild.id}')
			await self.bot.conn.commit()
			try:
				self.autoroles[ctx.guild.id] = None
			except KeyError:
				pass
			return await ctx.send(f'Successfully disabled auto-role in {discord.utils.escape_mentions(ctx.guild.name)}')
		else:
			roleid = role.id
			await self.bot.db.execute(f'UPDATE settings SET autorole = {roleid} WHERE gid = {ctx.guild.id}')
			await self.bot.conn.commit()
			self.autoroles[ctx.guild.id] = {
				"role": roleid
			}
			return await ctx.send(f'Successfully enabled auto-role in {discord.utils.escape_mentions(ctx.guild.name)}! All new members will recieve the {role.name} role.')

	@commands.Cog.listener()
	async def on_member_join(self, member):
		try:
			if await self.member_guild_check(member):
				try:
					roleid = self.autoroles[member.guild.id]["role"]
					role = discord.utils.get(member.guild.roles, id=roleid)
				except Exception:
					return
				if role != None:
					await member.add_roles(role, reason='Auto-Role')
		except Exception:
			return

	@commands.command(name='reactrole', description='Automatically add a role to a user when they react to a message')
	async def reactrole(self, ctx, role: discord.Role = None, message: int = None, emote: typing.Union[int, str] = None):
		'''PFXautorole [<role name/id/mention> <message id> <emote>]\nUse command without arguments to disable'''
		await self.bot.db.execute(f'SELECT * FROM settings WHERE gid = {ctx.guild.id}')
		guildsettings = await self.bot.db.fetchone()
		if guildsettings == None:
			await self.bot.db.execute(f'INSERT INTO settings (\"gid\") VALUES ({ctx.guild.id});')
			await self.bot.conn.commit()
		if not role:
			await self.bot.db.execute(f'UPDATE settings SET (\"reactroleid\", \"reactrolemid\", \"reactroleeid\") = (0, 0, 0) WHERE gid = {ctx.guild.id}')
			await self.bot.conn.commit()
			try:
				self.reactroles[ctx.guild.id] = None
			except KeyError:
				pass
			return await ctx.send(f'Successfully disabled reaction role in {discord.utils.escape_mentions(ctx.guild.name)}')
		else:
			try:
				msg = await ctx.channel.fetch_message(message)
			except:
				for channel in ctx.guild.text_channels:
					perms = ctx.guild.me.permissions_in(channel)
					try:
						msg = await channel.fetch_message(message)
					except:
						continue
			if not msg:
				raise commands.ArgumentParsingError('Missing Message ID')
			if not emote:
				raise commands.ArgumentParsingError('Missing Emote')
			roleid = role.id
			messageid = msg.id
			try:
				emote = int(emote)
			except Exception:
				emote = str(emote)
			if type(emote) == int:
				emoteid = discord.utils.get(self.bot.emojis, id=emote)
				if emoteid == None:
					raise commands.ArgumentParsingError('Can\'t find emote from ID.')
				else:
					emote = emoteid
					emoteid = emoteid.id
			elif type(emote) == str:
				emoteid = emote
			await self.bot.db.execute(f'UPDATE settings SET (\"reactroleid\", \"reactrolemid\", \"reactroleeid\") = ({roleid}, {messageid}, \"{emoteid}\") WHERE gid = {ctx.guild.id}')
			await self.bot.conn.commit()
			await msg.add_reaction(emote)
			self.reactroles[ctx.guild.id] = {
				"role": roleid,
				"message": messageid,
				"emote": emoteid
			}
			return await ctx.send(f'Successfully enabled reaction role in {discord.utils.escape_mentions(ctx.guild.name)}!')

	@commands.command(name='addrank', description='Add a role that users can join through the rank command.')
	@has_permissions(manage_roles=True)
	@bot_has_permissions(manage_roles=True)
	@commands.guild_only()
	async def addrank(self, ctx, role: discord.Role):
		'''PFXaddrank <role>'''
		await self.bot.db.execute(f'INSERT INTO joinableranks (\"gid\", \"rid\") VALUES ({ctx.guild.id}, {role.id});')
		await self.bot.conn.commit()
		try:
			self.joinroles[ctx.guild.id].append(role.id)
		except KeyError:
			self.joinroles[ctx.guild.id] = []
			self.joinroles[ctx.guild.id].append(role.id)
		return await ctx.send(f'Successfully added the rank {role.mention}!')

	@commands.command(name='delrank', description='Remove a rank from the list of joinable roles.')
	@has_permissions(manage_roles=True)
	@bot_has_permissions(manage_roles=True)
	@commands.guild_only()
	async def delrank(self, ctx, role: discord.Role):
		'''PFXdelrank <role>'''
		await self.bot.db.execute(f'DELETE FROM joinableranks WHERE rid = {role.id};')
		await self.bot.conn.commit()
		try:
			self.joinroles[ctx.guild.id].remove(role.id) 
		except KeyError:
			pass
		return await ctx.send(f'Successfully removed the rank {role.mention}!')

	@commands.command(name='rank', description='List all available ranks and join a rank', aliases=['ranks'])
	@bot_has_permissions(manage_roles=True)
	@commands.guild_only()
	async def rank(self, ctx, *, role: str = None):
		'''PFXrank [<rank>]'''
		if not role:
			try:
				ranks = self.joinroles[ctx.guild.id]
			except KeyError:
				return await ctx.send('Seems like there\'s no ranks set for this guild :c')
			roles = []
			someremoved = 0
			for rank in ranks:
				role = discord.utils.get(ctx.guild.roles, id=rank)
				if not role:
					print(rank)
					await self.bot.db.execute(f'DELETE FROM joinableranks WHERE rid = {rank};')
					await self.bot.conn.commit()
					self.joinroles[ctx.guild.id].remove(rank)
					someremoved += 1
				else:
					roles.append(role)
			if roles == []:
				return await ctx.send('Seems like there\'s no ranks set for this guild :c')
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
			for r in ctx.guild.roles:
				if r.name.lower() == role.lower():
					rank = r
					break
			if not rank:
				return await ctx.send(f'I cannot find the rank `{role}`. Type \'{ctx.prefix}rank\' to see a list of ranks')
			try:
				if rank.id in self.joinroles[ctx.guild.id]:
					if rank in ctx.author.roles:
						await ctx.author.remove_roles(rank, reason='Left rank')
						await ctx.send(f'You successfully left the {rank.name} rank.')
					else:
						await ctx.author.add_roles(rank, reason='Joined rank')
						await ctx.send(f'You successfully joined the {rank.name} rank.')
				else:
					return await ctx.send(f'I cannot find the rank `{role}`. Type \'{ctx.prefix}rank\' to see a list of ranks')
			except KeyError:
				return await ctx.send(f'I cannot find any ranks for this guild :c')

	@commands.Cog.listener()
	async def on_reaction_add(self, reaction, user):
		if type(user) == discord.Member:
			try:
				if await self.member_guild_check(user):
					guild = user.guild
					message = reaction.message
					rr = self.reactroles[guild.id]
					roleid = rr["role"]
					msgid = rr["message"]
					emote = rr["emote"]
					if roleid != None:
						if msgid != None:
							if emote != None:
								emotecheck = None
								try:
									emote = int(emote)
									if emote == reaction.emoji.id:
										emotecheck = True
								except Exception:
									emote = str(emote)
									if emote == reaction.emoji:
										emotecheck = True
								if emotecheck:
									role = discord.utils.get(guild.roles, id=roleid)
									if role != None:
										try:
											await user.add_roles(role, reason='Reaction Role')
										except Exception:
											pass
			except Exception:
				return
	
	@commands.Cog.listener()
	async def on_reaction_remove(self, reaction, user):
		if type(user) == discord.Member:
			try:
				if await self.member_guild_check(user):
					guild = user.guild
					message = reaction.message
					rr = self.reactroles[guild.id]
					roleid = rr["role"]
					msgid = rr["message"]
					emote = rr["emote"]
					if roleid != None:
						if msgid != None:
							if emote != None:
								emotecheck = None
								try:
									emote = int(emote)
									if emote == reaction.emoji.id:
										emotecheck = True
								except Exception:
									emote = str(emote)
									if emote == reaction.emoji:
										emotecheck = True
								if emotecheck:
									role = discord.utils.get(guild.roles, id=roleid)
									if role != None:
										try:
											await user.remove_roles(role, reason='Reaction Role')
										except Exception:
											pass
			except Exception:
				return
			

def setup(bot):
	bot.add_cog(Premium(bot))