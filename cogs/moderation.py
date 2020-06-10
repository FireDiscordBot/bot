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


def parseTime(content, replace: bool = False):
	if replace:
		for regex in [
			r'(?:(?P<days>\d+)(?:d|days|day| days| day))',
			r'(?:(?P<hours>\d+)(?:h|hours|hour| hours| hour))',
			r'(?:(?P<minutes>\d+)(?:m|minutes|minute| minutes| minute))',
			r'(?:(?P<seconds>\d+)(?:s|seconds|second| seconds| second))'
		]:
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
		days = days.group(1) if days is not None else 0
		hours = hours.group(1) if hours is not None else 0
		minutes = minutes.group(1) if minutes is not None else 0
		seconds = seconds.group(1) if seconds is not None else 0
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
		if argument.top_role.position >= ctx.guild.me.top_role.position:
			await ctx.error('You cannot punish someone with a role higher than or equal to mine')
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
		muted = ctx.config.get('mod.mutedrole') or discord.utils.get(ctx.guild.roles, name="Muted")
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
		self.bot.loop.create_task(self.loadMutes())
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
		for m in mutes:
			if m['uid'] is not None:
				guild = m['gid']
				if not self.bot.get_guild(guild):
					continue
				until = m['until'] if 'until' in m else False
				if not until:
					continue
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
				muted = self.bot.get_config(guild).get('mod.mutedrole') or discord.utils.get(guild.roles, name="Muted")
				if guild and user and muted:
					if muted in user.roles:
						if until:
							if datetime.datetime.now(datetime.timezone.utc).timestamp() > until:
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
									logch = self.bot.get_config(guild).get('log.moderation')
									if logch:
										embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc))
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
							if datetime.datetime.now(datetime.timezone.utc).timestamp() < until:
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

	def cog_unload(self):
		self.tempmuteChecker.cancel()

	@tasks.loop(minutes=1)
	async def tempmuteChecker(self):
		try:
			for g in self.mutes:
				mutes = self.mutes[g]
				for m in mutes:
					mute = self.mutes[g][m]
					until = mute['until'] if 'until' in mute else False
					if until and datetime.datetime.now(datetime.timezone.utc).timestamp() > until:
						try:
							con = await self.bot.db.acquire()
							async with con.transaction():
								query = 'DELETE FROM mutes WHERE uid = $1 AND gid = $2;'
								await self.bot.db.execute(query, mute['uid'], mute['gid'])
							await self.bot.db.release(con)
							self.bot.logger.warn(f'$YELLOWDeleted mute for $CYAN{mute["uid"]} $YELLOWin $CYAN{mute["gid"]}')
							try:
								del self.mutes[mute['gid']][mute['uid']]
							except KeyError:
								pass
						except Exception as e:
							self.bot.logger.error(f'$REDFailed to delete mute for $CYAN{mute["uid"]} $REDin $CYAN{mute["gid"]}', exc_info=e)
					else:
						continue
					guild = self.bot.get_guild(mute['gid'])
					if not guild:
						del self.mutes[mute['gid']]
						continue
					user = guild.get_member(mute['uid'])
					muted = self.bot.get_config(guild).get('mod.mutedrole') or discord.utils.get(guild.roles, name="Muted")
					if guild and user and muted:
						if muted in user.roles:
							removefail = False
							try:
								await user.remove_roles(muted, reason='Times up.')
							except discord.HTTPException as e:
								removefail = str(e)
							logch = self.bot.get_config(guild).get('log.moderation')
							if logch:
								embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc))
								embed.set_author(name=f'Unmute | {user}', icon_url=str(user.avatar_url_as(static_format='png', size=2048)))
								embed.add_field(name='User', value=user.mention, inline=False)
								embed.add_field(name='Moderator', value=guild.me.mention, inline=False)
								embed.add_field(name='Reason', value='Times up', inline=False)
								if removefail:
									embed.add_field(name='Error', value=f'Failed to remove role\n{removefail}', inline=False)
								embed.set_footer(text=f'User ID: {user.id} | Mod ID: {guild.me.id}')
								try:
									await logch.send(embed=embed)
								except Exception:
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
					muted = self.bot.get_config(guild).get('mod.mutedrole') or discord.utils.get(guild.roles, name="Muted")
					if muted:
						try:
							await member.add_roles(muted, reason='Muted.')
						except discord.HTTPException:
							pass

	async def mute(self, ctx, user, reason, until = None, timedelta = None, modlogs: TextChannel = None):
		if not reason:
			reason = "No Reason Provided."
		muted = ctx.config.get('mod.mutedrole') or discord.utils.get(ctx.guild.roles, name="Muted")
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
					await channel.set_permissions(muted, send_messages=False)
			except discord.Forbidden:
				return await ctx.error("I have no permissions to make a muted role")
			await user.add_roles(muted)
			if e:
				await e.delete()
		else:
			await user.add_roles(muted)
		if not ctx.silent:
			await ctx.success(f"**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** has been muted")
		try:
			await user.send(f'You were muted in {discord.utils.escape_mentions(discord.utils.escape_markdown(ctx.guild.name))} for "{reason}"')
			nodm = False
		except discord.HTTPException:
			nodm = True
		con = await self.bot.db.acquire()
		async with con.transaction():
			if until:
				query = 'INSERT INTO mutes (\"gid\", \"uid\", \"until\") VALUES ($1, $2, $3);'
				await self.bot.db.execute(query, ctx.guild.id, user.id, until)
			else:
				query = 'INSERT INTO mutes (\"gid\", \"uid\") VALUES ($1, $2);'
				await self.bot.db.execute(query, ctx.guild.id, user.id)
			query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
			await self.bot.db.execute(query, ctx.guild.id, user.id, reason or "No Reason Provided.", datetime.datetime.now(datetime.timezone.utc).strftime('%d/%m/%Y @ %I:%M:%S %p'), 'mute', datetime.datetime.now(datetime.timezone.utc).timestamp() + user.id)
		await self.bot.db.release(con)
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
		if modlogs:
			embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc))
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
			await modlogs.send(embed=embed)


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

		delete = 0
		if '-d' in reason:
			delete = re.findall(r'--?d(?:elete)? (\d{1,5})', reason, re.MULTILINE)
			reason = re.sub(r'--?d(?:elete)? (\d{1,5})', '', reason, 0, re.MULTILINE)
			delete = int(delete[0]) if delete else 0
			if delete > 7 or delete < 1:  # idk if \d will match a negative number lol
				return await ctx.error(f'I cannot delete {delete} days of messages. The maximum is 7 and the minimum is 1')

		try:
			await ctx.guild.fetch_ban(user)
			return await ctx.error('That user is already banned!')
		except discord.NotFound:
			pass
		# current = await ctx.guild.bans()
		# if len([b for b in current if b.user.id == user.id]) >= 1:
		#	return await ctx.error('That user is already banned!')
		try:
			try:
				await user.send(f'You were banned from {discord.utils.escape_mentions(discord.utils.escape_markdown(ctx.guild.name))} for "{reason}"')
				nodm = False
			except discord.HTTPException:
				nodm = True
			await ctx.guild.ban(user, reason=f"Banned by {ctx.author} for {reason}", delete_message_days=0)
			logch = ctx.config.get('log.moderation')
			if logch:
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc))
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
			if not ctx.silent:
				await ctx.success(f"**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** has been banished from {discord.utils.escape_mentions(discord.utils.escape_markdown(ctx.guild.name))}.")
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
				await self.bot.db.execute(query, ctx.guild.id, user.id, reason, datetime.datetime.now(datetime.timezone.utc).strftime('%d/%m/%Y @ %I:%M:%S %p'), 'ban', datetime.datetime.now(datetime.timezone.utc).timestamp() + user.id)
			await self.bot.db.release(con)
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

		try:
			await ctx.guild.unban(discord.Object(user.id), reason=f"Unbanned by {ctx.author} for {reason}")
		except discord.HTTPException:
			return await ctx.error(f'Failed to unban. Maybe they aren\'t even banned?')
		logch = ctx.config.get('log.moderation')
		if logch:
			embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc))
			embed.set_author(name=f'Unban | {user}', icon_url=str(user.avatar_url_as(static_format='png', size=2048)))
			embed.add_field(name='User', value=f'{user}({user.id})', inline=False)
			embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
			embed.add_field(name='Reason', value=reason, inline=False)
			embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
			try:
				await logch.send(embed=embed)
			except Exception:
				pass
		if not ctx.silent:
			await ctx.success(f"**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** has been unbanished from {discord.utils.escape_mentions(discord.utils.escape_markdown(ctx.guild.name))}.")
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
			await self.bot.db.execute(query, ctx.guild.id, user.id, reason, datetime.datetime.now(datetime.timezone.utc).strftime('%d/%m/%Y @ %I:%M:%S %p'), 'unban', datetime.datetime.now(datetime.timezone.utc).timestamp() + user.id)
		await self.bot.db.release(con)

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
			messages = 7

		try:
			await ctx.guild.fetch_ban(user)
			return await ctx.error('That user is banned so I\'m not sure how a softban is gonna do anything. May I introduce you to the unban command?')
		except discord.NotFound:
			pass

		try:
			await ctx.guild.ban(user, reason=f"Softbanned by {ctx.author} for {reason}", delete_message_days=messages)
			logch = ctx.config.get('log.moderation')
			if logch:
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc))
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
			if not ctx.silent:
				await ctx.success(f"**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** has been soft-banned.")
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
				await self.bot.db.execute(query, ctx.guild.id, user.id, reason or "No Reason Provided.", datetime.datetime.now(datetime.timezone.utc).strftime('%d/%m/%Y @ %I:%M:%S %p'), 'softban', datetime.datetime.now(datetime.timezone.utc).timestamp() + user.id)
			await self.bot.db.release(con)
		except discord.Forbidden:
			await ctx.error("Soft-ban failed. Are you trying to soft-ban someone higher than the bot?")


	@commands.command(description='Sets the muted role Fire will use', aliases=['mutedrole'])
	@commands.has_permissions(manage_roles=True)
	@commands.bot_has_permissions(manage_roles=True)
	async def muterole(self, ctx, *, role: Role = None):
		await ctx.config.set('mod.mutedrole', role)
		if role:
			return await ctx.success(f'Set the muted role to {role}')
		return await ctx.success('Reset the muted role.')


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
		logch = ctx.config.get('log.moderation')
		if reason:
			if parseTime(reason):
				days, hours, minutes, seconds = parseTime(reason)
			else:
				days, hours, minutes, seconds = 0, 0, 0, 0
		else:
			days, hours, minutes, seconds = 0, 0, 0, 0
		if days == 0 and hours == 0 and minutes == 0 and seconds == 0:
			return await self.mute(ctx, user, reason=reason, modlogs=logch)
		elif days == 0 and hours == 0 and minutes == 0 and seconds < 60:
			return await ctx.error('That time is too short, please specify a longer time!')
		else:
			td = datetime.timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)
			until = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)
			reason = parseTime(reason, True)
			return await self.mute(ctx, user, reason=reason, until=until, timedelta=td, modlogs=logch)

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
				if not ctx.silent:
					await ctx.success(f'**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** has been warned.')
			except discord.Forbidden:
				nodm = True
				await ctx.send(f'<a:fireWarning:660148304486727730> **{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** was not warned due to having DMs off. The warning has been logged.')
			logch = ctx.config.get('log.moderation')
			if logch:
				embed = discord.Embed(color=discord.Color(15105570), timestamp=datetime.datetime.now(datetime.timezone.utc))
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
			await self.bot.db.execute(query, ctx.guild.id, user.id, reason, datetime.datetime.now(datetime.timezone.utc).strftime('%d/%m/%Y @ %I:%M:%S %p'), 'warn', datetime.datetime.now(datetime.timezone.utc).timestamp() + user.id)
		await self.bot.db.release(con)

	@commands.command(description="View warnings for a user", aliases=['warns'])
	@commands.has_permissions(manage_messages=True)
	async def warnings(self, ctx, user: UserWithFallback = None):
		if not user:
			user = ctx.author
		warnings = await self.bot.db.fetch(
			'SELECT * FROM modlogs WHERE uid=$1 AND gid=$2 AND type=$3',
			user.id,
			ctx.guild.id,
			'warn'
		)
		if not warnings:
			return await ctx.error('No warnings found')
		paginator = WrappedPaginator(prefix='', suffix='')
		for warn in warnings:
			paginator.add_line(f'**Case ID**: {warn["caseid"]}\n'
							   f'**User**: {user}\n'
							   f'**Reason**: {warn["reason"]}\n'
							   f'**Date**: {warn["date"]}\n'
							   f'**-----------------**')		
		embed = discord.Embed(color=discord.Color(15105570), timestamp=datetime.datetime.now(datetime.timezone.utc))
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
		await ctx.success(f'Cleared warn!')

	@commands.command(description="View moderation logs for a user")
	@commands.has_permissions(manage_messages=True)
	async def modlogs(self, ctx, user: UserWithFallback = None):
		if not user:
			user = ctx.author
		mlogs = await self.bot.db.fetch(
			'SELECT * FROM modlogs WHERE uid=$1 AND gid=$2',
			user.id,
			ctx.guild.id
		)
		if not mlogs:
			return await ctx.error('No modlogs found')
		paginator = WrappedPaginator(prefix='', suffix='')
		for log in mlogs:
			paginator.add_line(f'**Case ID**: {log["caseid"]}\n'
							   f'**Type**: {log["type"].capitalize()}\n'
							   f'**User**: {user}\n'
							   f'**Reason**: {log["reason"]}\n'
							   f'**Date**: {log["date"]}\n'
							   f'**-----------------**')
		embed = discord.Embed(color=discord.Color(15105570), timestamp=datetime.datetime.now(datetime.timezone.utc))
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
			logch = ctx.config.get('log.moderation')
			if logch:
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc))
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
			if not ctx.silent:
				await ctx.success(f'**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** has been kicked.')
			con = await self.bot.db.acquire()
			async with con.transaction():
				query = 'INSERT INTO modlogs (\"gid\", \"uid\", \"reason\", \"date\", \"type\", \"caseid\") VALUES ($1, $2, $3, $4, $5, $6);'
				await self.bot.db.execute(query, ctx.guild.id, user.id, reason or "No Reason Provided.", datetime.datetime.now(datetime.timezone.utc).strftime('%d/%m/%Y @ %I:%M:%S %p'), 'kick', datetime.datetime.now(datetime.timezone.utc).timestamp() + user.id)
			await self.bot.db.release(con)
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
		muted = ctx.config.get('mod.mutedrole') or discord.utils.get(ctx.guild.roles, name="Muted")
		await user.remove_roles(muted, reason=f'Unmuted by {ctx.author}')
		if not ctx.silent:
			await ctx.success(f"**{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}** has been unmuted")
		con = await self.bot.db.acquire()
		async with con.transaction():
			query = 'DELETE FROM mutes WHERE uid = $1 AND gid = $2;'
			await self.bot.db.execute(query, user.id, ctx.guild.id)
		await self.bot.db.release(con)
		try:
			self.mutes[ctx.guild.id].pop(user.id, None)
		except KeyError:
			pass
		logch = ctx.config.get('log.moderation')
		if logch:
			embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc))
			embed.set_author(name=f'Unmute | {user}', icon_url=str(user.avatar_url_as(static_format='png', size=2048)))
			embed.add_field(name='User', value=user.mention, inline=False)
			embed.add_field(name='Moderator', value=ctx.author.mention, inline=False)
			embed.set_footer(text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
			try:
				await logch.send(embed=embed)
			except Exception:
				pass

	@commands.command(description="Mute a user/role in the current channel.", aliases=['blobk'])
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

		current = ctx.channel.overwrites_for(blocked)
		current.update(
			send_messages=False,
			add_reactions=False
		)
		await ctx.channel.set_permissions(
			blocked,
			overwrite=current,
			reason=reason
		)
		if not ctx.silent:
			await ctx.success(f'Successfully blocked **{discord.utils.escape_mentions(discord.utils.escape_markdown(str(blocked)))}** from chatting in {ctx.channel.mention}.')
		logch = ctx.config.get('log.moderation')
		if logch:
			embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc))
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

	@commands.command(description="Unmute a user/role who has been blocked in the current channel.", aliases=['unblobk'])
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

		current = ctx.channel.overwrites_for(blocked)
		current.update(
			send_messages=None,
			add_reactions=None
		)
		if current.is_empty():
			curent = None
		await ctx.channel.set_permissions(
			blocked,
			overwrite=current,
			reason=reason
		)
		if not ctx.silent:
			await ctx.success(f'Successfully unblocked **{discord.utils.escape_mentions(discord.utils.escape_markdown(str(blocked)))}**. Welcome back!')
		logch = ctx.config.get('log.moderation')
		if logch:
			embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc))
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
			if not ctx.silent:
				await ctx.success(f'Successfully removed all roles from **{discord.utils.escape_mentions(discord.utils.escape_markdown(str(user)))}**.')
		logch = ctx.config.get('log.moderation')
		if logch:
			embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc))
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
