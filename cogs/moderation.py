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
from discord.ext import commands, tasks
import typing
import datetime
import asyncpg
import asyncio
import traceback
import functools
import humanfriendly
import re
from fire.converters import UserWithFallback, Member, TextChannel, Role
from jishaku.paginators import WrappedPaginator, PaginatorEmbedInterface

day_regex = re.compile(r'(?:(?P<days>\d+)(?:d|days|day| days| day))')
hour_regex = re.compile(r'(?:(?P<hours>\d+)(?:h|hours|hour| hours| hour))')
min_regex = re.compile(r'(?:(?P<minutes>\d+)(?:m|minutes|minute| minutes| minute))')
sec_regex = re.compile(r'(?:(?P<seconds>\d+)(?:s|seconds|second| seconds| second))')
# _time_regex = re.compile(
# 	r'(?:(?P<days>\d+)d)? *(?:(?P<hours>\d+)h)? *(?:(?P<minutes>\d+)m)? *(?:(?P<seconds>\d+)s)')

def parseTime(content, replace: bool = False):
	if replace:
		for regex in [r'(?:(?P<days>\d+)(?:d|days|day| days| day))', r'(?:(?P<hours>\d+)(?:h|hours|hour| hours| hour))', r'(?:(?P<minutes>\d+)(?:m|minutes|minute| minutes| minute))', r'(?:(?P<seconds>\d+)(?:s|seconds|second| seconds| second))']:
			content = re.sub(regex, '', content, 0, re.MULTILINE)
		return content
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
		if ctx.guild.owner_id == ctx.author.id:
			return argument
		permission = argument.guild_permissions.manage_messages
		if ctx.author.id == 287698408855044097:
			return argument
		if not permission:
			return argument
		else:
			await ctx.error("You cannot punish other staff members")
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
			await ctx.error("The user was not muted.")
			return False

class Moderation(commands.Cog, name="Mod Commands"):
	"""Commands used to moderate your guild"""

	def __init__(self, bot):
		self.bot = bot
		self.mutes = {}
		self.warns = {}
		self.modlogs = {}
		asyncio.get_event_loop().create_task(self.loadMutes())
		asyncio.get_event_loop().create_task(self.loadwarns())
		asyncio.get_event_loop().create_task(self.loadmodlogs())
		self.tempmuteChecker.start()

	async def __error(self, ctx, error):
		if isinstance(error, commands.BadArgument):
			await ctx.send(discord.utils.escape_mentions(discord.utils.escape_markdown(error)))

	async def loadMutes(self):
		await self.bot.wait_until_ready()
		self.bot.logger.info(f'$YELLOWLoading mutes...')
		self.mutes = {}
		query = 'SELECT * FROM mutes;'
		mutes = await self.bot.db.fetch(query)
		# await self.bot.db.execute('SELECT * FROM mutes;')
		# mutes = await self.bot.db.fetchall()
		for m in mutes:
			if m['uid'] != None:
				guild = m['gid']
				if not self.bot.get_guild(guild):
					continue
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
										query = 'DELETE FROM mutes WHERE uid = $1 AND gid = $2;'
										await self.bot.db.execute(query, user.id, guild.id)
									await self.bot.db.release(con)
									try:
										self.mutes[user.id] = None
									except KeyError:
										pass
									logch = self.bot.configs[guild.id].get('log.moderation')
									if logch:
										embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
										embed.set_author(name=f'Unmute | {user}', icon_url=str(user.avatar_url_as(static_format='png', size=2048)))
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
		self.bot.logger.info(f'$GREENLoaded mutes!')

	async def loadwarns(self):
		await self.bot.wait_until_ready()
		self.bot.logger.info(f'$YELLOWLoading warns...')
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
		self.bot.logger.info(f'$GREENLoaded warns!')

	async def loadmodlogs(self):
		await self.bot.wait_until_ready()
		self.bot.logger.info(f'$YELLOWLoading modlogs...')
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
		self.bot.logger.info(f'$GREENLoaded modlogs')

	def cog_unload(self):
		self.tempmuteChecker.cancel()

	@tasks.loop(seconds=1)
	async def tempmuteChecker(self):
		try:
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
										con = await self.bot.db.acquire()
										async with con.transaction():
											query = 'DELETE FROM mutes WHERE uid = $1 AND gid = $2;'
											await self.bot.db.execute(query, user.id, guild.id)
										await self.bot.db.release(con)
										try:
											self.mutes[user.id] = None
										except KeyError:
											pass
									except Exception:
										self.bot.logger.error(f'$REDFailed to delete mute for {user} in {guild}')
									try:
										await user.remove_roles(muted, reason='Times up.')
										logch = self.bot.configs[guild.id].get('log.moderation')
										if logch:
											embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
											embed.set_author(name=f'Unmute | {user}', icon_url=str(user.avatar_url_as(static_format='png', size=2048)))
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
		except Exception as e:
			pass

	@tempmuteChecker.after_loop
	async def after_tempmuteChecker(self):
		self.bot.logger.warn(f'$YELLOWTempmute checker has stopped!')

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

	# @commands.Cog.listener()
	# async def on_ready(self):
	# 	await asyncio.sleep(15)
	# 	await self.loadMutes()
	# 	await self.loadwarns()
	# 	await self.loadmodlogs()
	# 	print('Moderation loaded!')

	@commands.command(name='loadmod', description='Load moderation data', hidden=True)
	async def loadmod(self, ctx):
		if await self.bot.is_team_owner(ctx.author):
			await self.loadMutes()
			await self.loadwarns()
			await self.loadmodlogs()
			await ctx.send('Loaded data!')
		else:
			await ctx.send('no.')

	async def mute(self, ctx, user, reason, until = None, timedelta = None, channel: TextChannel = None):
		if not reason:
			reason = "No Reason Provided."
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
				return await ctx.error("I have no permissions to make a muted role")
			await user.add_roles(muted)
			if e:
				await e.delete()
		else:
			await user.add_roles(muted)
		await ctx.success(f"**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** has been muted")
		try:
			await user.send(f'You were muted in {discord.utils.escape_mentions(discord.utils.escape_markdown(ctx.guild.name))} for "{reason}"')
			nodm = False
		except discord.HTTPException:
			nodm = True
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
			else:
				self.mutes[ctx.guild.id] = {}
				self.mutes[ctx.guild.id][user.id] = {
					"uid": user.id,
					"gid": ctx.guild.id
				}
		if channel:
			embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
			embed.set_author(name=f'Mute | {user}', icon_url=str(user.avatar_url_as(static_format='png', size=2048)))
			embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
			embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
			embed.add_field(name='Reason', value=reason, inline=False)
			if timeup:
				timedelta = humanfriendly.format_timespan(timedelta)
				embed.add_field(name='Until', value=f'{timeup} UTC ({timedelta})', inline=False)
			if nodm:
				embed.add_field(name='DM Received?', value='No, user has DMs off or has blocked me.', inline=False)
			embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
			await channel.send(embed=embed)
		
		if mutedchat:
			try:
				await mutedchat.set_permissions(muted, send_messages=True,
													read_message_history=True,
													read_messages=True)
				await mutedchat.send(f"Welcome {user.mention} to {mutedchat.mention} You will spend your time here until you get unmuted. Enjoy the silence.")
			except discord.Forbidden:
				return


	@commands.command(aliases=["banish", "begone", "gtfo", "410", "perish", "bonk", "bean"], description="Ban a user from the server")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(ban_members=True)
	async def ban(self, ctx, user: typing.Union[StaffCheck, UserWithFallback] = None, *, reason: str = "No Reason Provided.", ):
		try:
			await ctx.message.delete()
		except Exception:
			pass
		await ctx.trigger_typing()
		if user == False:
			return

		if not user:
			return await ctx.send("You must specify a user")

		current = await ctx.guild.bans()
		if len([b for b in current if b.user.id == user.id]) >= 1:
			return await ctx.error('That user is already banned!')
		try:
			try:
				await user.send(f'You were banned from {discord.utils.escape_mentions(discord.utils.escape_markdown(ctx.guild.name))} for "{reason}"')
				nodm = False
			except discord.HTTPException:
				nodm = True
			await ctx.guild.ban(user, reason=f"Banned by {ctx.author} for {reason}")
			logch = self.bot.configs[ctx.guild.id].get('log.moderation')
			if logch:
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
				embed.set_author(name=f'Ban | {user}', icon_url=str(user.avatar_url_as(static_format='png', size=2048)))
				embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
				embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
				embed.add_field(name='Reason', value=reason, inline=False)
				if nodm:
					embed.add_field(name='DM Received?', value='No, user has DMs off or has blocked me.', inline=False)
				embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			await ctx.success(f"**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** has been banished from {discord.utils.escape_mentions(discord.utils.escape_markdown(ctx.guild.name))}.")
			await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'moderation.bans'))
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
				await self.bot.db.execute(query, ctx.guild.id, user.id, reason, datetime.datetime.utcnow().strftime('%d/%m/%Y @ %I:%M:%S %p'), 'ban', datetime.datetime.utcnow().timestamp() + user.id)
			await self.bot.db.release(con)
			await self.loadmodlogs()
		except discord.Forbidden:
			await ctx.error("Ban failed. Are you trying to ban someone higher than the bot?")

	@commands.command(aliases=["unbanish"], description="Unban a user from the server")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(ban_members=True)
	async def unban(self, ctx, user: UserWithFallback = None, *, reason: str = "No Reason Provided."):
		try:
			await ctx.message.delete()
		except Exception:
			pass
		await ctx.trigger_typing()

		if not user:
			return await ctx.send("You must specify a user")
		
		await ctx.guild.unban(discord.Object(user.id), reason=f"Unbanned by {ctx.author} for {reason}")
		logch = self.bot.configs[ctx.guild.id].get('log.moderation')
		if logch:
			embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
			embed.set_author(name=f'Unban | {user}', icon_url=str(user.avatar_url_as(static_format='png', size=2048)))
			embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
			embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
			embed.add_field(name='Reason', value=reason, inline=False)
			embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
			try:
				await logch.send(embed=embed)
			except Exception:
				pass
		await ctx.success(f"**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** has been unbanished from {discord.utils.escape_mentions(discord.utils.escape_markdown(ctx.guild.name))}.")
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
	async def softban(self, ctx, user: StaffCheck = None, messages: int = 7, *, reason = "No Reason Provided."):
		try:
			await ctx.message.delete()
		except Exception:
			pass
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
			await ctx.guild.ban(user, reason=f"Softbanned by {ctx.author} for {reason}", delete_message_days=messages) 
			logch = self.bot.configs[ctx.guild.id].get('log.moderation')
			if logch:
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
				embed.set_author(name=f'Softban | {user}', icon_url=str(user.avatar_url_as(static_format='png', size=2048)))
				embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
				embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
				embed.add_field(name='Reason', value=reason, inline=False)
				embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			await ctx.guild.unban(user, reason="Temporarily Banned")
			await ctx.success(f"**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** has been soft-banned.")
			await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'moderation.softbans'))
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
				await self.bot.db.execute(query, ctx.guild.id, user.id, reason or "No Reason Provided.", datetime.datetime.utcnow().strftime('%d/%m/%Y @ %I:%M:%S %p'), 'softban', datetime.datetime.utcnow().timestamp() + user.id)
			await self.bot.db.release(con)
			await self.loadmodlogs()
		except discord.Forbidden:
			await ctx.error("Soft-ban failed. Are you trying to soft-ban someone higher than the bot?")

	@commands.command(name='mute', description="Mute a user.", aliases=["silence", "tempmute", "403"])
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(manage_roles=True)
	async def mutecmd(self, ctx, user: StaffCheck, *, reason: str = "No Reason Provided."):
		try:
			await ctx.message.delete()
		except Exception:
			pass
		if user == False:
			return
		if not user:
			return await ctx.send('You must specify a user')
		await ctx.trigger_typing()
		logch = self.bot.configs[ctx.guild.id].get('log.moderation')
		if reason:
			if parseTime(reason):
				days, hours, minutes, seconds = parseTime(reason)
			else:
				days, hours, minutes, seconds = 0, 0, 0, 0
		else:
			days, hours, minutes, seconds = 0, 0, 0, 0
		if days == 0 and hours == 0 and minutes == 0 and seconds == 0:
			await self.mute(ctx, user, reason=reason, channel=logch)
		else:
			td = datetime.timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)
			until = datetime.datetime.utcnow() + datetime.timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)
			reason = parseTime(reason, True)
			await self.mute(ctx, user, reason=reason, until=until, timedelta=td, channel=logch)

	@commands.command(description="Warn a user.")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(manage_messages=True)
	async def warn(self, ctx, user: Member = None, *, reason = None):
		await ctx.trigger_typing()
		try:
			await ctx.message.delete()
		except Exception:
			pass

		if not user:
			return await ctx.send("You must specify a user")
		if not reason:
			return await ctx.send("You must specify a reason")
		if user.id == self.bot.user.id:
			return await ctx.error("I cannot warn myself, you fool.")

		try:
			try:
				await user.send(f'You were warned in {discord.utils.escape_mentions(discord.utils.escape_markdown(ctx.guild.name))} for "{reason}"')
				nodm = False
				await ctx.success(f'**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** has been warned.')
			except discord.Forbidden:
				nodm = True
				await ctx.send(f'<a:fireWarning:660148304486727730> **{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** was not warned due to having DMs off. The warning has been logged.')
			logch = self.bot.configs[ctx.guild.id].get('log.moderation')
			if logch:
				embed = discord.Embed(color=discord.Color(15105570), timestamp=datetime.datetime.utcnow())
				embed.set_author(name=f'Warn | {user}', icon_url=str(user.avatar_url_as(static_format='png', size=2048)))
				embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
				embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
				embed.add_field(name='Reason', value=reason, inline=False)
				if nodm:
					embed.add_field(name='Error', value='Unable to send DM, user was not warned.', inline=False)
				embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
		except Exception:
			return
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
			await self.bot.db.execute(query, ctx.guild.id, user.id, reason, datetime.datetime.utcnow().strftime('%d/%m/%Y @ %I:%M:%S %p'), 'warn', datetime.datetime.utcnow().timestamp() + user.id)
		await self.bot.db.release(con)
		await self.loadwarns()
		await self.loadmodlogs()

	@commands.command(description="View warnings for a user", aliases=['warns'])
	@commands.has_permissions(manage_messages=True)
	async def warnings(self, ctx, user: UserWithFallback = None):
		if not user:
			user = ctx.author
		try:
			if type(user) == discord.User or type(user) == discord.Member:
				warnings = self.warns[ctx.guild.id][user.id]
			elif type(user) == int:
				warnings = self.warns[ctx.guild.id][user]
		except KeyError:
			return await ctx.error(f'No warnings found.')
		paginator = WrappedPaginator(prefix='', suffix='')
		for warn in warnings:
			paginator.add_line(f'**Case ID**: {warn["caseid"]}\n**User**: {user}\n**Reason**: {warn["reason"]}\n**Date**: {warn["date"]}\n**-----------------**')
		embed = discord.Embed(color=discord.Color(15105570), timestamp=datetime.datetime.utcnow())
		interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
		await interface.send_to(ctx)

	@commands.command(description="Clear a users warnings", aliases=['clearwarnings'])
	@commands.has_permissions(manage_guild=True)
	async def clearwarns(self, ctx, user: Member = None):
		if not user:
			return await ctx.error(f'You must specify a user')

		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM modlogs WHERE type = $1 AND uid = $2 AND gid = $3;'
			await self.bot.db.execute(query, 'warn', user.id, ctx.guild.id)
		await self.bot.db.release(con)
		await self.loadwarns()
		await self.loadmodlogs()
		await ctx.success(f'**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}**\'s warns have been cleared')

	@commands.command(description="Clear a single warning", aliases=['clearwarning'])
	@commands.has_permissions(manage_guild=True)
	async def clearwarn(self, ctx, case: int = None):
		if not case:
			return await ctx.error(f'You must specify a case id')

		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM modlogs WHERE type = $1 AND gid = $2 AND caseid = $3;'
			await self.bot.db.execute(query, 'warn', ctx.guild.id, case)
		await self.bot.db.release(con)
		await self.loadwarns()
		await self.loadmodlogs()
		await ctx.success(f'Cleared warn!')

	@commands.command(description="View moderation logs for a user")
	@commands.has_permissions(manage_messages=True)
	async def modlogs(self, ctx, user: UserWithFallback = None):
		if not user:
			user = ctx.author
		try:
			if type(user) == discord.User or type(user) == discord.Member:
				mlogs = self.modlogs[ctx.guild.id][user.id]
			elif type(user) == int:
				mlogs = self.modlogs[ctx.guild.id][user]
		except KeyError:
			return await ctx.error(f'No logs found.')
		paginator = WrappedPaginator(prefix='', suffix='')
		for log in mlogs:
			paginator.add_line(f'**Case ID**: {log["caseid"]}\n**Type**: {log["type"].capitalize()}\n**User**: {user}\n**Reason**: {log["reason"]}\n**Date**: {log["date"]}\n**-----------------**')
		embed = discord.Embed(color=discord.Color(15105570), timestamp=datetime.datetime.utcnow())
		interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
		await interface.send_to(ctx)

	@commands.command(description="Kick a user.", aliases=["yeet", "409"])
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(kick_members=True)
	async def kick(self, ctx, user: StaffCheck = None, *, reason = "No Reason Provided."):
		await ctx.trigger_typing()
		try:
			await ctx.message.delete()
		except Exception:
			pass
		if user == False:
			return

		if not user:
			return await ctx.send("You must specify a user")
		
		try:
			try:
				await user.send(f'You were kicked from {discord.utils.escape_mentions(discord.utils.escape_markdown(ctx.guild.name))} for "{reason}"')
				nodm = False
			except discord.HTTPException:
				nodm = True
			await ctx.guild.kick(user, reason=f"Kicked by {ctx.author} for {reason}")
			logch = self.bot.configs[ctx.guild.id].get('log.moderation')
			if logch:
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
				embed.set_author(name=f'Kick | {user}', icon_url=str(user.avatar_url_as(static_format='png', size=2048)))
				embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
				embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
				embed.add_field(name='Reason', value=reason, inline=False)
				if nodm:
					embed.add_field(name='DM Received?', value='No, user has DMs off or has blocked me.', inline=False)
				embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			await ctx.success(f'**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** has been kicked.')
			await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'moderation.kicks'))
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
				await self.bot.db.execute(query, ctx.guild.id, user.id, reason or "No Reason Provided.", datetime.datetime.utcnow().strftime('%d/%m/%Y @ %I:%M:%S %p'), 'kick', datetime.datetime.utcnow().timestamp() + user.id)
			await self.bot.db.release(con)
			await self.loadmodlogs()
		except discord.Forbidden:
			await ctx.error("Kick failed. Are you trying to kick someone higher than the bot?")
	
	@commands.command(description="Unmute a muted user.")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(manage_roles=True)
	async def unmute(self, ctx, user: MuteCheck):
		try:
			await ctx.message.delete()
		except Exception:
			pass
		if not user:
			return
		await ctx.trigger_typing()
		await user.remove_roles(discord.utils.get(ctx.guild.roles, name="Muted"))
		await ctx.success(f"**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** has been unmuted")
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
		logch = self.bot.configs[ctx.guild.id].get('log.moderation')
		if logch:
			embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
			embed.set_author(name=f'Unmute | {user}', icon_url=str(user.avatar_url_as(static_format='png', size=2048)))
			embed.add_field(name='User', value=user.mention, inline=False)
			embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
			embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
			try:
				await logch.send(embed=embed)
			except Exception:
				pass

	@commands.command(description="Mute a user/role in the current channel.")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(manage_roles=True)
	async def block(self, ctx, blocked: typing.Union[StaffCheck, Role] = None, *, reason = 'No Reason Provided.'):
		try:
			await ctx.message.delete()
		except Exception:
			pass
		await ctx.trigger_typing()
		if isinstance(blocked, discord.Member):
			blocktype = 'User'
		elif isinstance(blocked, discord.Role):
			blocktype = 'Role'
		if blocked == False:
			return

		if not blocked:
			return await ctx.send("You must specify a user")
		
		await ctx.channel.set_permissions(blocked, send_messages=False, reason=reason)
		await ctx.success(f'Successfully blocked **{discord.utils.escape_mentions(discord.utils.escape_markdown(str(blocked)))}** from chatting in {ctx.channel.mention}.')
		logch = self.bot.configs[ctx.guild.id].get('log.moderation')
		if logch:
			embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
			embed.set_author(name=f'Block | {blocked}', icon_url=str(blocked.avatar_url_as(static_format='png', size=2048)) if blocktype == 'User' else str(ctx.guild.icon_url))
			embed.add_field(name=blocktype, value=f'{blocked}({blocked.id})', inline=False)
			embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
			embed.add_field(name='Channel', value=ctx.channel.mention, inline=False)
			embed.add_field(name='Reason', value=reason, inline=False)
			embed.set_footer(text=f'{blocktype} ID: {blocked.id} | Mod ID: {ctx.author.id}')
			try:
				await logch.send(embed=embed)
			except Exception:
				pass
	
	@commands.command(description="Unmute a user/role who has been blocked in the current channel.")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(manage_roles=True)
	async def unblock(self, ctx, blocked: typing.Union[StaffCheck, Role] = None, *, reason = 'No Reason Provided.'):
		try:
			await ctx.message.delete()
		except Exception:
			pass
		await ctx.trigger_typing()
		if isinstance(blocked, discord.Member):
			blocktype = 'User'
		elif isinstance(blocked, discord.Role):
			blocktype = 'Role'
		if blocked == False:
			return
			
		if not blocked:
			return await ctx.send("You must specify a user")
		
		await ctx.channel.set_permissions(blocked, send_messages=None, reason=reason)
		await ctx.success(f'Successfully unblocked **{discord.utils.escape_mentions(discord.utils.escape_markdown(str(blocked)))}**. Welcome back!')
		logch = self.bot.configs[ctx.guild.id].get('log.moderation')
		if logch:
			embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
			embed.set_author(name=f'Unblock | {blocked}', icon_url=str(blocked.avatar_url_as(static_format='png', size=2048)) if blocktype == 'User' else str(ctx.guild.icon_url))
			embed.add_field(name=blocktype, value=f'{blocked}({blocked.id})', inline=False)
			embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
			embed.add_field(name='Channel', value=ctx.channel.mention, inline=False)
			embed.add_field(name='Reason', value=reason, inline=False)
			embed.set_footer(text=f'User ID: {blocked.id} | Mod ID: {ctx.author.id}')
			try:
				await logch.send(embed=embed)
			except Exception:
				pass

	@commands.command(description="Remove all ranks from a user. You're welcome Sk1er", aliases=['dethrone'])
	@commands.has_permissions(manage_roles=True)
	@commands.bot_has_permissions(manage_roles=True)
	async def derank(self, ctx, user: StaffCheck = None, *, reason = 'No Reason Provided.'):
		try:
			await ctx.message.delete()
		except Exception:
			pass
		await ctx.trigger_typing()
		if user == False:
			return
			
		if not user:
			return await ctx.send("You must specify a user")

		roles = []
		cantrem = []

		for role in user.roles:
			if not role.is_default():
				try:
					await user.remove_roles(role, reason=f'Deranking by {ctx.author} for "{reason}"')
					roles.append(role.mention)
				except discord.Forbidden:
					cantrem.append(role.name)
		if len(cantrem) >= 1:
			await ctx.error(f'I wasn\'t able to remove the roles {", ".join(cantrem)} from **{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}**.')
		else:
			await ctx.success(f'Successfully removed all roles from **{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}**.')
		logch = self.bot.configs[ctx.guild.id].get('log.moderation')
		if logch:
			embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
			embed.set_author(name=f'Derank | {user}', icon_url=str(user.avatar_url_as(static_format='png', size=2048)))
			embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
			embed.add_field(name='Moderator', value=user.mention, inline=False)
			embed.add_field(name='Roles', value=', '.join(roles), inline=False)
			embed.add_field(name='Reason', value=reason, inline=False)
			embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
			try:
				await logch.send(embed=embed)
			except Exception:
				pass


def setup(bot):
	bot.add_cog(Moderation(bot))
	bot.logger.info(f'$GREENLoaded Moderation cog!')
