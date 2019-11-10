"""
MIT License
Copyright (c) 2019 GamingGeek

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
from discord.ext import commands, tasks
import typing
import datetime
import asyncpg
import asyncio
import traceback
import functools
import humanfriendly
import re
from fire.converters import UserWithFallback, Member, TextChannel
from jishaku.paginators import WrappedPaginator, PaginatorEmbedInterface

day_regex = re.compile(r'(?:(?P<days>\d+)d)')
hour_regex = re.compile(r'(?:(?P<hours>\d+)h)')
min_regex = re.compile(r'(?:(?P<minutes>\d+)m)')
sec_regex = re.compile(r'(?:(?P<seconds>\d+)s)')
# _time_regex = re.compile(
# 	r'(?:(?P<days>\d+)d)? *(?:(?P<hours>\d+)h)? *(?:(?P<minutes>\d+)m)? *(?:(?P<seconds>\d+)s)')

def parseTime(content):
	try:
		days = day_regex.search(content)
		hours = hour_regex.search(content)
		minutes = min_regex.search(content)
		seconds = sec_regex.search(content)
	except Exception:
		return 0, 0, 0, 0
	time = 0
	if days or hours or minutes or seconds:
		days = days.group(1) if days != None else 0
		hours = hours.group(1) if hours != None else 0
		minutes = minutes.group(1) if minutes != None else 0
		seconds = seconds.group(1) if seconds != None else 0
		days = int(days) if days else 0
		if not days:
			days = 0
		hours = int(hours) if hours else 0
		if not hours:
			hours = 0
		minutes = int(minutes) if minutes else 0
		if not minutes:
			minutes = 0
		seconds = int(seconds) if seconds else 0
		if not seconds:
			seconds = 0
		return days, hours, minutes, seconds

class StaffCheck(commands.Converter):
	async def convert(self, ctx, argument):
		argument = await Member().convert(ctx, argument)
		if type(argument) != discord.Member:
			return False
		permission = argument.guild_permissions.manage_messages
		if ctx.author.id == 287698408855044097 and argument.id != 287698408855044097:
			return argument
		if not permission:
			return argument
		else:
			await ctx.send("<a:fireFailed:603214400748257302> You cannot punish other staff members")
			return False

class StaffCheckNoMessage(commands.Converter):
	async def convert(self, ctx, argument):
		argument = await Member().convert(ctx, argument)
		permission = argument.guild_permissions.manage_messages
		if ctx.author.id == 287698408855044097 and argument.id != 287698408855044097:
			return argument
		if not permission:
			return argument
		else:
			return False

class MuteCheck(commands.Converter):
	async def convert(self, ctx, argument):
		argument = await Member().convert(ctx, argument)
		muted = discord.utils.get(ctx.guild.roles, name="Muted")
		if muted in argument.roles:
			return argument
		else:
			await ctx.send("<a:fireFailed:603214400748257302> The user was not muted.")
			return False
						
class Moderation(commands.Cog, name="Mod Commands"):
	"""Commands used to moderate your guild"""
	
	def __init__(self, bot):
		self.bot = bot
		self.mutes = {}
		self.warns = {}
		self.modlogs = {}
		self.tempmuteChecker.start()
	
	async def __error(self, ctx, error):
		if isinstance(error, commands.BadArgument):
			await ctx.send(error)

	async def loadMutes(self):
		self.mutes = {}
		query = 'SELECT * FROM mutes;'
		mutes = await self.bot.db.fetch(query)
		# await self.bot.db.execute('SELECT * FROM mutes;')
		# mutes = await self.bot.db.fetchall()
		for m in mutes:
			if m['uid'] != None:
				guild = m['gid']
				until = m['until'] if 'until' in m else False
				user = m['uid']
				if guild in self.mutes:
					self.mutes[guild][user] = {						
						"uid": user,
						"gid": guild,
						"until": until
					}
				else:
					self.mutes[guild] = {}
					self.mutes[guild][user] = {						
						"uid": user,
						"gid": guild,
						"until": until
					}
		for g in self.mutes:
			mutes = self.mutes[g]
			for m in mutes:
				mute = self.mutes[g][m]
				guild = self.bot.get_guild(mute['gid'])
				if not guild:
					continue
				user = guild.get_member(mute['uid'])
				until = mute['until'] if 'until' in mute else False
				muted = discord.utils.get(guild.roles, name="Muted")
				if guild and user and muted:
					if muted in user.roles:
						if until:
							if datetime.datetime.utcnow().timestamp() > until:
								try:
									await user.remove_roles(muted, reason='Times up.')
									con = await self.bot.db.acquire()
									async with con.transaction():
										query = 'DELETE FROM mutes WHERE uid = $1;'
										await self.bot.db.execute(query, user.id)
									await self.bot.db.release(con)
									try:
										self.mutes[user.id] = None
									except KeyError:
										pass
									logchannels = self.bot.get_cog("Settings").logchannels
									logid = logchannels[guild.id] if guild.id in logchannels else None
									if logid:
										logch = guild.get_channel(logid['modlogs'])
										if logch:
											embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
											embed.set_author(name=f'Unmute | {user}', icon_url=str(user.avatar_url))
											embed.add_field(name='User', value=user.mention, inline=False)
											embed.add_field(name='Moderator', value=guild.me.mention, inline=False)
											embed.set_footer(text=f'User ID: {user.id} | Mod ID: {guild.me.id}')
											try:
												await logch.send(embed=embed)
											except Exception:
												pass
								except discord.HTTPException:
									pass
						else:
							break
					else:
						if until:
							if datetime.datetime.utcnow().timestamp() < until:
								try:
									await user.add_roles(muted, reason='Muted.')
								except discord.HTTPException:
									pass
						else:
							try:
								await user.add_roles(muted, reason='Muted.')
							except discord.HTTPException:
								pass

	async def loadwarns(self):
		self.warns = {}
		query = 'SELECT * FROM modlogs WHERE type = $1;'
		warns = await self.bot.db.fetch(query, 'warn')
		for w in warns:
			guild = w['gid']
			user = w['uid']
			try:
				currentguildwarns = self.warns[guild]
			except KeyError:
				self.warns[guild] = {}
			try:
				currentuserwarns = self.warns[guild][user]
			except KeyError:
				self.warns[guild][user] = []
			self.warns[guild][user].append({						
				"uid": user,
				"gid": guild,
				"reason": w['reason'],
				"date": w['date'],
				"caseid": w['caseid']
			})
			
	async def loadmodlogs(self):
		self.modlogs = {}
		query = 'SELECT * FROM modlogs;'
		logs = await self.bot.db.fetch(query)
		for l in logs:
			guild = l['gid']
			user = l['uid']
			try:
				currentguildlogs = self.modlogs[guild]
			except KeyError:
				self.modlogs[guild] = {}
			try:
				currentuserlogs = self.modlogs[guild][user]
			except KeyError:
				self.modlogs[guild][user] = []
			self.modlogs[guild][user].append({						
				"uid": user,
				"gid": guild,
				"type": l['type'],
				"reason": l['reason'],
				"date": l['date'],
				"caseid": l['caseid']
			})

	def cog_unload(self):
		self.tempmuteChecker.cancel()

	@tasks.loop(seconds=5.0)
	async def tempmuteChecker(self):
		try:
			for g in self.mutes:
				mutes = self.mutes[g]
				for m in mutes:
					mute = self.mutes[g][m]
					guild = self.bot.get_guild(mute['gid'])
					user = guild.get_member(mute['uid'])
					until = mute['until'] if 'until' in mute else False
					muted = discord.utils.get(guild.roles, name="Muted")
					if guild and user and muted:
						if muted in user.roles:
							if until:
								if datetime.datetime.utcnow().timestamp() > until:
									try:
										await user.remove_roles(muted, reason='Times up.')
										con = await self.bot.db.acquire()
										async with con.transaction():
											query = 'DELETE FROM mutes WHERE uid = $1 AND gid = $2;'
											await self.bot.db.execute(query, user.id, guild.id)
										await self.bot.db.release(con)
										try:
											self.mutes[user.id] = None
										except KeyError:
											pass
										logchannels = self.bot.get_cog("Settings").logchannels
										logid = logchannels[guild.id] if guild.id in logchannels else None
										if logid:
											logch = guild.get_channel(logid['modlogs'])
											if logch:
												embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
												embed.set_author(name=f'Unmute | {user}', icon_url=str(user.avatar_url))
												embed.add_field(name='User', value=user.mention, inline=False)
												embed.add_field(name='Moderator', value=guild.me.mention, inline=False)
												embed.add_field(name='Reason', value='Times up', inline=False)
												embed.set_footer(text=f'User ID: {user.id} | Mod ID: {guild.me.id}')
												try:
													await logch.send(embed=embed)
												except Exception:
													pass
									except discord.HTTPException:
										pass
		except Exception:
			pass

	@tempmuteChecker.after_loop
	async def after_tempmuteChecker(self):
		print('"tempmuteChecker" Task ended.')

	@commands.Cog.listener()
	async def on_member_join(self, member):
		guild = member.guild
		mutes = self.mutes[guild.id] if guild.id in self.mutes else None
		if mutes:
			for mute in mutes:
				mute = self.mutes[guild.id][mute]
				if mute['uid'] == member.id:
					muted = discord.utils.get(guild.roles, name="Muted")
					if muted:
						try:
							await member.add_roles(muted, reason='Muted.')
						except discord.HTTPException:
							pass

	@commands.Cog.listener()
	async def on_ready(self):
		await asyncio.sleep(15)
		await self.loadMutes()
		await self.loadwarns()
		await self.loadmodlogs()
		print('Moderation loaded!')

	@commands.command(name='loadmod', description='Load moderation data', hidden=True)
	async def loadmod(self, ctx):
		'''PFXloadmod'''
		if await self.bot.is_team_owner(ctx.author):
			await self.loadMutes()
			await self.loadwarns()
			await self.loadmodlogs()
			await ctx.send('Loaded data!')
		else:
			await ctx.send('no.')

	async def mute(self, ctx, user, reason, until = None, timedelta = None, channel: TextChannel = None):
		if not reason:
			reason = "No reason specified."
		muted = discord.utils.get(ctx.guild.roles, name="Muted")
		mutedchat = discord.utils.get(ctx.guild.text_channels, name="muted-chat")
		if until:
			timeup = datetime.datetime.strftime(until, '%d/%m/%Y @ %I:%M:%S %p')
			until = until.timestamp()
		else:
			timeup = None
		e = False
		if not muted:
			try:
				muted = await ctx.guild.create_role(name="Muted", reason="To use for muting", color=discord.Color.orange())
				e = await ctx.send('Can\'t find muted role. Making one now...')
				roles = ctx.guild.roles
				for role in roles:
					try:
						await muted.edit(position=role.position)
					except Exception:
						pass
				for channel in ctx.guild.channels:
					await channel.set_permissions(muted, send_messages=False,
												read_message_history=False,
												read_messages=False)
			except discord.Forbidden:
				return await ctx.send("<a:fireFailed:603214400748257302> I have no permissions to make a muted role")
			await user.add_roles(muted)
			if e:
				await e.delete()
			await ctx.send(f"<a:fireSuccess:603214443442077708> **{user}** has been muted")
			try:
				await user.send(f'You were muted in {ctx.guild} for "{reason}"')
			except discord.HTTPException:
				pass
			await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'moderation.mutes'))
			# await self.bot.db.execute(f'INSERT INTO mutes (\"gid\", \"uid\") VALUES ({ctx.guild.id}, {user.id});')
			# await self.bot.conn.commit()
			con = await self.bot.db.acquire()
			async with con.transaction():
				if until:
					query = 'INSERT INTO mutes (\"gid\", \"uid\", \"until\") VALUES ($1, $2, $3);'
					await self.bot.db.execute(query, ctx.guild.id, user.id, until)
				else:
					query = 'INSERT INTO mutes (\"gid\", \"uid\") VALUES ($1, $2);'
					await self.bot.db.execute(query, ctx.guild.id, user.id)
				query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
				await self.bot.db.execute(query, ctx.guild.id, user.id, reason or "No Reason Provided.", datetime.datetime.utcnow().strftime('%d/%m/%Y @ %I:%M:%S %p'), 'mute', datetime.datetime.utcnow().timestamp() + user.id)
			await self.bot.db.release(con)
			await self.loadmodlogs()
			if until:
				if ctx.guild.id in self.mutes:
					self.mutes[ctx.guild.id][user.id] = {
						"uid": user.id,
						"gid": ctx.guild.id,
						"until": until
					}
				else:
					self.mutes[ctx.guild.id] = {}
					self.mutes[ctx.guild.id][user.id] = {
						"uid": user.id,
						"gid": ctx.guild.id,
						"until": until
					}
			else:
				if ctx.guild.id in self.mutes:
					self.mutes[ctx.guild.id][user.id] = {
						"uid": user.id,
						"gid": ctx.guild.id
					}
			if channel:
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
				embed.set_author(name=f'Mute | {user}', icon_url=str(user.avatar_url))
				embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
				embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
				embed.add_field(name='Reason', value=reason, inline=False)
				if timeup:
					timedelta = humanfriendly.format_timespan(timedelta)
					embed.add_field(name='Until', value=f'{timeup} UTC ({timedelta})', inline=False)
				embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
				await channel.send(embed=embed)
		else:
			await user.add_roles(muted)
			await ctx.send(f"<a:fireSuccess:603214443442077708> **{user}** has been muted")
			try:
				await user.send(f'You were muted in {ctx.guild} for "{reason}"')
			except discord.HTTPException:
				pass
			await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'moderation.mutes'))
			# await self.bot.db.execute(f'INSERT INTO mutes (\"gid\", \"uid\") VALUES ({ctx.guild.id}, {user.id});')
			# await self.bot.conn.commit()
			con = await self.bot.db.acquire()
			async with con.transaction():
				if until:
					query = 'INSERT INTO mutes (\"gid\", \"uid\", \"until\") VALUES ($1, $2, $3);'
					await self.bot.db.execute(query, ctx.guild.id, user.id, until)
				else:
					query = 'INSERT INTO mutes (\"gid\", \"uid\") VALUES ($1, $2);'
					await self.bot.db.execute(query, ctx.guild.id, user.id)
				query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
				await self.bot.db.execute(query, ctx.guild.id, user.id, reason or "No Reason Provided.", datetime.datetime.utcnow().strftime('%d/%m/%Y @ %I:%M:%S %p'), 'mute', datetime.datetime.utcnow().timestamp() + user.id)
			await self.bot.db.release(con)
			await self.loadmodlogs()
			if until:
				if ctx.guild.id in self.mutes:
					self.mutes[ctx.guild.id][user.id] = {
						"uid": user.id,
						"gid": ctx.guild.id,
						"until": until
					}
				else:
					self.mutes[ctx.guild.id] = {}
					self.mutes[ctx.guild.id][user.id] = {
						"uid": user.id,
						"gid": ctx.guild.id,
						"until": until
					}
			else:
				if ctx.guild.id in self.mutes:
					self.mutes[ctx.guild.id][user.id] = {
						"uid": user.id,
						"gid": ctx.guild.id
					}
			if channel:
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
				embed.set_author(name=f'Mute | {user}', icon_url=str(user.avatar_url))
				embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
				embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
				embed.add_field(name='Reason', value=reason, inline=False)
				if timeup:
					timedelta = humanfriendly.format_timespan(timedelta)
					embed.add_field(name='Until', value=f'{timeup} UTC ({timedelta})', inline=False)
				embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
				await channel.send(embed=embed)
		
		if not mutedchat:
			overwrites = {ctx.guild.default_role: discord.PermissionOverwrite(read_messages=False),
						ctx.guild.me: discord.PermissionOverwrite(send_messages=True),
						muted: discord.PermissionOverwrite(read_message_history=True, read_messages=True, send_messages=True)}
			try:
				channel = await ctx.guild.create_text_channel('muted-chat', overwrites=overwrites)
				await channel.send(f"Welcome {user.mention} to {channel.mention} You will spend your time here until you get unmuted. Enjoy the silence.")
			except discord.Forbidden:
				return
		else:
			try:
				await mutedchat.set_permissions(muted, send_messages=True,
													read_message_history=True,
													read_messages=True)
				await mutedchat.send(f"Welcome {user.mention} to {mutedchat.mention} You will spend your time here until you get unmuted. Enjoy the silence.")
			except discord.Forbidden:
				return

			
	@commands.command(aliases=["banish", "begone", "gtfo", "410"], description="Ban a user from the server")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(ban_members=True)
	async def ban(self, ctx, user: typing.Union[StaffCheck, UserWithFallback] = None, *, reason: str = None, ):
		"""PFXban <user> [<reason>]"""
		await ctx.message.delete()
		await ctx.trigger_typing()
		if user == False:
			return

		if not user:
			return await ctx.send("You must specify a user")
		
		try:
			if reason:
				try:
					await user.send(f'You were banned from {ctx.guild} for "{reason}"')
				except discord.HTTPException:
					pass
				await ctx.guild.ban(user, reason=f"Banned by {ctx.author} for {reason}")
				logchannels = self.bot.get_cog("Settings").logchannels
				logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
				if logid:
					logch = ctx.guild.get_channel(logid['modlogs'])
					if logch:
						embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
						embed.set_author(name=f'Ban | {user}', icon_url=str(user.avatar_url))
						embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
						embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
						embed.add_field(name='Reason', value=reason, inline=False)
						embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
						try:
							await logch.send(embed=embed)
						except Exception:
							pass
				await ctx.send(f"<a:fireSuccess:603214443442077708> **{user}** has been banished from {ctx.guild.name}.")
				await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'moderation.bans'))
				con = await self.bot.db.acquire()
				async with con.transaction():
					query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
					await self.bot.db.execute(query, ctx.guild.id, user.id, reason, datetime.datetime.utcnow().strftime('%d/%m/%Y @ %I:%M:%S %p'), 'ban', datetime.datetime.utcnow().timestamp() + user.id)
				await self.bot.db.release(con)
				await self.loadmodlogs()
			else:
				try:
					await user.send(f'You were banned from {ctx.guild}')
				except discord.HTTPException:
					pass
				await ctx.guild.ban(user, reason=f"Banned by {ctx.author}")
				logchannels = self.bot.get_cog("Settings").logchannels
				logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
				if logid:
					logch = ctx.guild.get_channel(logid['modlogs'])
					if logch:
						embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
						embed.set_author(name=f'Ban | {user}', icon_url=str(user.avatar_url))
						embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
						embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
						embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
						try:
							await logch.send(embed=embed)
						except Exception:
							pass
				await ctx.send(f"<a:fireSuccess:603214443442077708> **{user}** has been banished from {ctx.guild.name}")
				await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'moderation.bans'))
				con = await self.bot.db.acquire()
				async with con.transaction():
					query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
					await self.bot.db.execute(query, ctx.guild.id, user.id, reason, datetime.datetime.utcnow().strftime('%d/%m/%Y @ %I:%M:%S %p'), 'ban', datetime.datetime.utcnow().timestamp() + user.id)
				await self.bot.db.release(con)
				await self.loadmodlogs()
		except discord.Forbidden:
			await ctx.send("<a:fireFailed:603214400748257302> Ban failed. Are you trying to ban someone higher than the bot?")

	@commands.command(aliases=["unbanish"], description="Unban a user from the server")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(ban_members=True)
	async def unban(self, ctx, user: UserWithFallback = None, *, reason: str = None, ):
		"""PFXunban <user> [<reason>]"""
		await ctx.message.delete()
		await ctx.trigger_typing()

		if not user:
			return await ctx.send("You must specify a user")
		
		if reason:
			await ctx.guild.unban(user, reason=f"Unbanned by {ctx.author} for {reason}")
			logchannels = self.bot.get_cog("Settings").logchannels
			logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
			if logid:
				logch = ctx.guild.get_channel(logid['modlogs'])
				if logch:
					embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
					embed.set_author(name=f'Unban | {user}', icon_url=str(user.avatar_url))
					embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
					embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
					embed.add_field(name='Reason', value=reason, inline=False)
					embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
			await ctx.send(f"<a:fireSuccess:603214443442077708> **{user}** has been unbanished from {ctx.guild.name}.")
			await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'moderation.unbans'))
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
				await self.bot.db.execute(query, ctx.guild.id, user.id, reason, datetime.datetime.utcnow().strftime('%d/%m/%Y @ %I:%M:%S %p'), 'unban', datetime.datetime.utcnow().timestamp() + user.id)
			await self.bot.db.release(con)
			await self.loadmodlogs()
		else:
			await ctx.guild.ban(user, reason=f"Unbanned by {ctx.author}")
			logchannels = self.bot.get_cog("Settings").logchannels
			logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
			if logid:
				logch = ctx.guild.get_channel(logid['modlogs'])
				if logch:
					embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
					embed.set_author(name=f'Unban | {user}', icon_url=str(user.avatar_url))
					embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
					embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
					embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
			await ctx.send(f"<a:fireSuccess:603214443442077708> **{user}** has been unbanished from {ctx.guild.name}")
			await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'moderation.unbans'))
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
				await self.bot.db.execute(query, ctx.guild.id, user.id, reason, datetime.datetime.utcnow().strftime('%d/%m/%Y @ %I:%M:%S %p'), 'unban', datetime.datetime.utcnow().timestamp() + user.id)
			await self.bot.db.release(con)
			await self.loadmodlogs()
	
	@commands.command(description="Temporarily restricts access to this server.")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(ban_members=True)
	async def softban(self, ctx, user: StaffCheck = None, messages: int = 7, *, reason = None, ):
		"""PFXsoftban <user> <amount of days: 1-7> [<reason>]"""
		await ctx.message.delete()
		await ctx.trigger_typing()
		if user == False:
			return

		if not user:
			return await ctx.send("You must specify a user")
		
		if messages > 7:
			raise commands.ArgumentParsingError('I can only delete up to 7 days of messages')
		elif messages < 0:
			raise commands.ArgumentParsingError('That\'s not a valid number of days. It should be 1-7')

		try:
			if reason:
				await ctx.guild.ban(user, reason=f"Softbanned by {ctx.author} for {reason}", delete_message_days=messages) 
				logchannels = self.bot.get_cog("Settings").logchannels
				logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
				if logid:
					logch = ctx.guild.get_channel(logid['modlogs'])
					if logch:
						embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
						embed.set_author(name=f'Softban | {user}', icon_url=str(user.avatar_url))
						embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
						embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
						embed.add_field(name='Reason', value=reason, inline=False)
						embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
						try:
							await logch.send(embed=embed)
						except Exception:
							pass
				await ctx.guild.unban(user, reason="Temporarily Banned")
			else:
				await ctx.guild.ban(user, reason=f"Softbanned by {ctx.author}", delete_message_days=messages) 
				logchannels = self.bot.get_cog("Settings").logchannels
				logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
				if logid:
					logch = ctx.guild.get_channel(logid['modlogs'])
					if logch:
						embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
						embed.set_author(name=f'Softban | {user}', icon_url=str(user.avatar_url))
						embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
						embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
						embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
						try:
							await logch.send(embed=embed)
						except Exception:
							pass
				await ctx.guild.unban(user, reason="Temporarily Banned")
			await ctx.send(f"<a:fireSuccess:603214443442077708> **{user}** has been soft-banned.")
			await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'moderation.softbans'))
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
				await self.bot.db.execute(query, ctx.guild.id, user.id, reason or "No Reason Provided.", datetime.datetime.utcnow().strftime('%d/%m/%Y @ %I:%M:%S %p'), 'softban', datetime.datetime.utcnow().timestamp() + user.id)
			await self.bot.db.release(con)
			await self.loadmodlogs()
		except discord.Forbidden:
			await ctx.send("<a:fireFailed:603214400748257302> Soft-ban failed. Are you trying to soft-ban someone higher than the bot?")
	
	# @commands.command(name='mute', description="Mute a user.")
	# @commands.has_permissions(manage_messages=True)
	# @commands.bot_has_permissions(manage_roles=True)
	# async def mutecmd(self, ctx, user: StaffCheck, *, reason = None):
	# 	"""PFXmute <user> [<reason>]"""
	# 	await ctx.message.delete()
	# 	if user == False:
	# 		return
	# 	if not user:
	# 		return await ctx.send('You must specify a user')
	# 	await ctx.trigger_typing()
	# 	logchannels = self.bot.get_cog("Settings").logchannels
	# 	logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
	# 	logch = None
	# 	if logid:
	# 		logch = ctx.guild.get_channel(logid['modlogs'])
	# 	await self.mute(ctx, user, reason=reason or "No reason provided.", channel=logch)

	@commands.command(name='mute', description="Mute a user.", aliases=["silence", "tempmute", "403"])
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(manage_roles=True)
	async def mutecmd(self, ctx, user: StaffCheck, *, reason: str = None):
		"""PFXmute <user> [<time> <reason>]\n\nTime format: `1d 2h 3m 4s` == `1 day, 2 hours, 3 minutes and 4 seconds`"""
		await ctx.message.delete()
		if user == False:
			return
		if not user:
			return await ctx.send('You must specify a user')
		await ctx.trigger_typing()
		logchannels = self.bot.get_cog("Settings").logchannels
		logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
		logch = None
		if logid:
			logch = ctx.guild.get_channel(logid['modlogs'])
		if reason:
			if parseTime(reason):
				days, hours, minutes, seconds = parseTime(reason)
			else:
				days, hours, minutes, seconds = 0, 0, 0, 0
		else:
			days, hours, minutes, seconds = 0, 0, 0, 0
		if days == 0 and hours == 0 and minutes == 0 and seconds == 0:
			if reason == '' or reason == ' ':
				reason = 'No reason provided.'
			await self.mute(ctx, user, reason=reason or "No reason provided.", channel=logch)
		else:
			td = datetime.timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)
			until = datetime.datetime.utcnow() + datetime.timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)
			reason = reason.replace(f'{days}d ', '').replace(f'{hours}h ', '').replace(f'{minutes}m ', '').replace(f'{seconds}s ', '')
			if reason == '' or reason == ' ':
				reason = 'No reason provided.'
			await self.mute(ctx, user, reason=reason or "No reason provided.", until=until, timedelta=td, channel=logch)
	
	@commands.command(description="Warn a user.")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(manage_messages=True)
	async def warn(self, ctx, user: Member = None, *, reason = None):
		"""PFXwarn <user> <reason>"""
		await ctx.trigger_typing()
		await ctx.message.delete()

		if not user:
			return await ctx.send("You must specify a user")
		if not reason:
			return await ctx.send("You must specify a reason")
		if user.id == self.bot.user.id:
			return await ctx.send("<a:fireFailed:603214400748257302> I cannot warn myself, you fool.")

		try:
			await user.send(f'You were warned in {ctx.guild.name} for "{reason}"')
			await ctx.send(f'<a:fireSuccess:603214443442077708> **{user}** has been warned.')
			logchannels = self.bot.get_cog("Settings").logchannels
			logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
			if logid:
				logch = ctx.guild.get_channel(logid['modlogs'])
				if logch:
					embed = discord.Embed(color=discord.Color(15105570), timestamp=datetime.datetime.utcnow())
					embed.set_author(name=f'Warn | {user}', icon_url=str(user.avatar_url))
					embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
					embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
					embed.add_field(name='Reason', value=reason, inline=False)
					embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
		except discord.Forbidden:
			await ctx.send(f'<a:fireFailed:603214400748257302> **{user}** was not warned, unable to dm.')
			logchannels = self.bot.get_cog("Settings").logchannels
			logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
			if logid:
				logch = ctx.guild.get_channel(logid['modlogs'])
				if logch:
					embed = discord.Embed(color=discord.Color(15105570), timestamp=datetime.datetime.utcnow())
					embed.set_author(name=f'Warn | {user}', icon_url=str(user.avatar_url))
					embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
					embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
					embed.add_field(name='Reason', value=reason, inline=False)
					embed.add_field(name='Error', value='Unable to send DM, user was not warned.', inline=False)
					embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
			await self.bot.db.execute(query, ctx.guild.id, user.id, reason, datetime.datetime.utcnow().strftime('%d/%m/%Y @ %I:%M:%S %p'), 'warn', datetime.datetime.utcnow().timestamp() + user.id)
		await self.bot.db.release(con)
		await self.loadwarns()
		await self.loadmodlogs()

	@commands.command(description="View warnings for a user")
	@commands.has_permissions(manage_messages=True)
	async def warnings(self, ctx, user: UserWithFallback = None):
		"""PFXwarnings <user>"""
		if not user:
			user = ctx.author
		try:
			if type(user) == discord.User or type(user) == discord.Member:
				warnings = self.warns[ctx.guild.id][user.id]
			elif type(user) == int:
				warnings = self.warns[ctx.guild.id][user]
		except KeyError:
			return await ctx.send(f'<a:fireFailed:603214400748257302> No warnings found.')
		paginator = WrappedPaginator(prefix='', suffix='')
		for warn in warnings:
			paginator.add_line(f'**Case ID**: {warn["caseid"]}\n**User**: {user}\n**Reason**: {warn["reason"]}\n**Date**: {warn["date"]}\n**-----------------**')
		embed = discord.Embed(color=discord.Color(15105570), timestamp=datetime.datetime.utcnow())
		interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
		await interface.send_to(ctx)

	@commands.command(description="Clear a users warnings", aliases=['clearwarnings'])
	@commands.has_permissions(manage_guild=True)
	async def clearwarns(self, ctx, user: Member = None):
		"""PFXclearwarns <user>"""
		if not user:
			return await ctx.send(f'<a:fireFailed:603214400748257302> You must specify a user')

		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM modlogs WHERE type = $1 AND uid = $2 AND gid = $3;'
			await self.bot.db.execute(query, 'warn', user.id, ctx.guild.id)
		await self.bot.db.release(con)
		await self.loadwarns()
		await self.loadmodlogs()
		await ctx.send(f'<a:fireSuccess:603214443442077708> **{user}**\'s warns have been cleared')

	@commands.command(description="Clear a single warning", aliases=['clearwarning'])
	@commands.has_permissions(manage_guild=True)
	async def clearwarn(self, ctx, case: int = None):
		"""PFXclearwarn <case id>"""
		if not case:
			return await ctx.send(f'<a:fireFailed:603214400748257302> You must specify a case id')

		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM modlogs WHERE type = $1 AND gid = $2 AND caseid = $3;'
			await self.bot.db.execute(query, 'warn', ctx.guild.id, case)
		await self.bot.db.release(con)
		await self.loadwarns()
		await self.loadmodlogs()
		await ctx.send(f'<a:fireSuccess:603214443442077708> Cleared warn!')

	@commands.command(description="View moderation logs for a user")
	@commands.has_permissions(manage_messages=True)
	async def modlogs(self, ctx, user: UserWithFallback = None):
		"""PFXmodlogs <user>"""
		if not user:
			user = ctx.author
		try:
			if type(user) == discord.User or type(user) == discord.Member:
				mlogs = self.modlogs[ctx.guild.id][user.id]
			elif type(user) == int:
				mlogs = self.modlogs[ctx.guild.id][user]
		except KeyError:
			return await ctx.send(f'<a:fireFailed:603214400748257302> No logs found.')
		paginator = WrappedPaginator(prefix='', suffix='')
		for log in mlogs:
			paginator.add_line(f'**Case ID**: {log["caseid"]}\n**Type**: {log["type"].capitalize()}\n**User**: {user}\n**Reason**: {log["reason"]}\n**Date**: {log["date"]}\n**-----------------**')
		embed = discord.Embed(color=discord.Color(15105570), timestamp=datetime.datetime.utcnow())
		interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
		await interface.send_to(ctx)

	@commands.command(description="Kick a user.", aliases=["yeet", "409"])
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(kick_members=True)
	async def kick(self, ctx, user: StaffCheck = None, *, reason = None):
		"""PFXkick <user> [<reason>]"""
		await ctx.trigger_typing()
		await ctx.message.delete()
		if user == False:
			return

		if not user:
			return await ctx.send("You must specify a user")
		
		try:
			if reason:
				try:
					await user.send(f'You were kicked from {ctx.guild} for "{reason}"')
				except discord.HTTPException:
					pass
				await ctx.guild.kick(user, reason=f"Kicked by {ctx.author} for {reason}")
				logchannels = self.bot.get_cog("Settings").logchannels
				logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
				if logid:
					logch = ctx.guild.get_channel(logid['modlogs'])
					if logch:
						embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
						embed.set_author(name=f'Kick | {user}', icon_url=str(user.avatar_url))
						embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
						embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
						embed.add_field(name='Reason', value=reason, inline=False)
						embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
						try:
							await logch.send(embed=embed)
						except Exception:
							pass
			else:
				try:
					await user.send(f'You were kicked from {ctx.guild}')
				except discord.HTTPException:
					pass
				await ctx.guild.kick(user, reason=f"Kicked by {ctx.author}")
				logchannels = self.bot.get_cog("Settings").logchannels
				logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
				if logid:
					logch = ctx.guild.get_channel(logid['modlogs'])
					if logch:
						embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
						embed.set_author(name=f'Kick | {user}', icon_url=str(user.avatar_url))
						embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
						embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
						embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
						try:
							await logch.send(embed=embed)
						except Exception:
							pass
			await ctx.send(f'<a:fireSuccess:603214443442077708> **{user}** has been kicked.')
			await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'moderation.kicks'))
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
				await self.bot.db.execute(query, ctx.guild.id, user.id, reason or "No Reason Provided.", datetime.datetime.utcnow().strftime('%d/%m/%Y @ %I:%M:%S %p'), 'kick', datetime.datetime.utcnow().timestamp() + user.id)
			await self.bot.db.release(con)
			await self.loadmodlogs()
		except discord.Forbidden:
			await ctx.send("<a:fireFailed:603214400748257302> Kick failed. Are you trying to kick someone higher than the bot?")
	
	@commands.command(description="Unmute a muted user.")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(manage_roles=True)
	async def unmute(self, ctx, user: MuteCheck):
		"""PFXunmute <user>"""
		await ctx.message.delete()
		if not user:
			return
		await ctx.trigger_typing()
		await user.remove_roles(discord.utils.get(ctx.guild.roles, name="Muted"))
		await ctx.send(f"<a:fireSuccess:603214443442077708> **{user}** has been unmuted")
		# await self.bot.db.execute(f'DELETE FROM mutes WHERE uid = {user.id};')
		# await self.bot.conn.commit()
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM mutes WHERE uid = $1;'
			await self.bot.db.execute(query, user.id)
		await self.bot.db.release(con)
		try:
			self.mutes[ctx.guild.id].pop(user.id, None)
		except KeyError:
			pass
		logchannels = self.bot.get_cog("Settings").logchannels
		logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
		if logid:
			logch = ctx.guild.get_channel(logid['modlogs'])
			if logch:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
				embed.set_author(name=f'Unmute | {user}', icon_url=str(user.avatar_url))
				embed.add_field(name='User', value=user.mention, inline=False)
				embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
				embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
				try:
					await logch.send(embed=embed)
				except Exception:
					pass

	@commands.command(description="Mute a user in the current channel.")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(manage_roles=True)
	async def block(self, ctx, user: StaffCheck = None, *, reason = 'No reason provided.'):
		"""PFXblock <user> [<reason>]"""
		try:
			await ctx.message.delete()
		except Exception:
			pass
		await ctx.trigger_typing()
		if user == False:
			return

		if not user:
			return await ctx.send("You must specify a user")
		
		await ctx.channel.set_permissions(user, send_messages=False, reason=reason or 'No reason specified.')
		await ctx.send(f'<a:fireSuccess:603214443442077708> Successfully blocked **{user}** from chatting in {ctx.channel.mention}.')
		logchannels = self.bot.get_cog("Settings").logchannels
		logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
		if logid:
			logch = ctx.guild.get_channel(logid['modlogs'])
			if logch:
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
				embed.set_author(name=f'Block | {user}', icon_url=str(user.avatar_url))
				embed.add_field(name='User', value=user.mention, inline=False)
				embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
				embed.add_field(name='Channel', value=ctx.channel.mention, inline=False)
				embed.add_field(name='Reason', value=reason, inline=False)
				embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
	
	@commands.command(description="Unmute a user who has been blocked in the current channel.")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(manage_roles=True)
	async def unblock(self, ctx, user: StaffCheck = None, *, reason = 'No reason provided.'):
		"""PFXunblock <user> [<reason>]"""
		try:
			await ctx.message.delete()
		except Exception:
			pass
		await ctx.trigger_typing()
		if user == False:
			return
			
		if not user:
			return await ctx.send("You must specify a user")
		
		await ctx.channel.set_permissions(user, send_messages=None, reason=reason or 'No reason specified.')
		await ctx.send(f'<a:fireSuccess:603214443442077708> Successfully unblocked **{user}**. Welcome back!')
		logchannels = self.bot.get_cog("Settings").logchannels
		logid = logchannels[ctx.guild.id] if ctx.guild.id in logchannels else None
		if logid:
			logch = ctx.guild.get_channel(logid['modlogs'])
			if logch:
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
				embed.set_author(name=f'Unblock | {user}', icon_url=str(user.avatar_url))
				embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
				embed.add_field(name='Moderator', value=user.mention, inline=False)
				embed.add_field(name='Channel', value=ctx.channel.mention, inline=False)
				embed.add_field(name='Reason', value=reason, inline=False)
				embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
								
								
def setup(bot):
	bot.add_cog(Moderation(bot))