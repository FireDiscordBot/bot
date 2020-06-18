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
import datetime
import json
import asyncpg
import typing
import asyncio
import aiohttp
import humanfriendly
import functools
import re
from random import randint
from fire.converters import TextChannel, Role, Member


watchedcmds = ['purge']
region = {
	'amsterdam': '🇳🇱 Amsterdam',
	'brazil': '🇧🇷 Brazil',
	'eu-central': '🇪🇺 Central Europe',
	'eu-west': '🇪🇺 Western Europe',
	'europe': '🇪🇺 Europe',
	'frakfurt': '🇩🇪 Frankfurt',
	'hongkong': '🇭🇰 Hong Kong',
	'india': '🇮🇳 India',
	'japan': '🇯🇵 Japan',
	'england': '🇬🇧 England',
	'russia': '🇷🇺 Russia',
	'singapore': '🇸🇬 Singapore',
	'southafrica': '🇿🇦 South Africa',
	'sydney': '🇦🇺 Sydney',
	'us-central': '🇺🇸 Central US',
	'us-south': '🇺🇸 US South',
	'us-east': '🇺🇸 US East',
	'us-west': '🇺🇸 US West',
	'vip-us-east': '🇺🇸 US East (VIP)',
	'vip-us-west': '🇺🇸 US West (VIP)',
	'vip-amsterdam': '🇳🇱 Amsterdam (VIP)'
}

class Settings(commands.Cog):
	def __init__(self, bot):
		self.bot = bot
		self.recentgban = []
		self.bot.load_invites = self.load_invites
		self.bot.get_invites = self.get_invites
		self.bot.loop.create_task(self.load_aliases())
		if not self.bot.dev:
			self.refresh_invites.start()

	def clean(self, text: str):
		return re.sub(r'[^A-Za-z0-9.\/ ]', '', text, 0, re.MULTILINE)

	@tasks.loop(minutes=5)
	async def refresh_invites(self):
		for gid in self.bot.premium_guilds:
			await self.load_invites(gid)

	def cog_unload(self):
		self.refresh_invites.cancel()

	@refresh_invites.after_loop
	async def after_refresh_invites(self):
		self.bot.logger.warn(f'$YELLOWInvite refresher has stopped!')

	async def load_aliases(self):
		await self.bot.wait_until_ready()
		self.bot.logger.info(f'$YELLOWLoading aliases...')
		query = 'SELECT * FROM aliases;'
		aliases = await self.bot.db.fetch(query)
		hasalias = []
		allaliases = {}
		for a in aliases:
			hasalias.append(a['uid'])
			for al in a['aliases']:
				allaliases[al.lower()] = a['uid']
		await self.bot.redis.set('hasalias', json.dumps(hasalias))
		await self.bot.redis.set('aliases', json.dumps(allaliases))
		self.bot.logger.info(f'$GREENLoaded aliases!')

	async def load_invites(self, gid: int = None):
		guilds = [g for g in self.bot.premium_guilds] if not gid else [gid]
		for g in guilds:
			guild = self.bot.get_guild(g)
			if not guild:
				continue
			invites = []
			try:
				invites = await guild.invites()
				if 'VANITY_URL' in guild.features:
					vanity = await guild.vanity_invite()
					invites.append(vanity)
			except (discord.Forbidden, discord.HTTPException) as e:
				if isinstance(e, discord.Forbidden):
					continue
				if isinstance(e, discord.HTTPException) and invites == []:
					continue
			ginvites = {guild.id: {}}
			for invite in invites:
				ginvites[guild.id][invite.code] = invite.uses
			await self.bot.redis.set(f'invites.{guild.id}', json.dumps(ginvites))
			if gid and len(guilds) == 1:
				return ginvites[guild.id]

	async def get_invites(self, gid: int = None):
		invites = {}
		guilds = [g for g in self.bot.premium_guilds] if not gid else [gid]
		for g in guilds:
			invs = json.loads((await self.bot.redis.get(f'invites.{g}', encoding='utf-8')) or '{}')
			invites.update(invs)
		return invites if not gid else invites[str(gid)]

	@commands.Cog.listener()
	async def on_guild_channel_pins_update(self, channel, last_pin = 0):
			logch = self.bot.get_config(channel.guild).get('log.action')
			if logch:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{channel.mention}\'**s pinned messages were updated**')
				embed.set_author(name=channel.guild.name, icon_url=str(channel.guild.icon_url))
				embed.set_footer(text=f"Channel ID: {channel.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass

	@commands.Cog.listener()
	async def on_guild_role_create(self, role):
		logch = self.bot.get_config(role.guild).get('log.action')
		if logch:
			embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**A new role was created**\n{role.mention}')
			embed.set_author(name=role.guild.name, icon_url=str(role.guild.icon_url))
			embed.set_footer(text=f"Role ID: {role.id}")
			try:
				await logch.send(embed=embed)
			except Exception:
				pass

	@commands.Cog.listener()
	async def on_guild_role_delete(self, role):
		logch = self.bot.get_config(role.guild).get('log.action')
		if logch:
			embed = discord.Embed(color=role.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**The role** `{role.name}` **was deleted**')
			embed.set_author(name=role.guild.name, icon_url=str(role.guild.icon_url))
			embed.set_footer(text=f"Role ID: {role.id}")
			try:
				await logch.send(embed=embed)
			except Exception:
				pass

	@commands.Cog.listener()
	async def on_voice_state_update(self, member, before, after):
		logch = self.bot.get_config(member.guild).get('log.action')
		if logch:
			if before.deaf != after.deaf:
				if after.deaf:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **was server deafened**')
					embed.set_author(name=member, icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
					if after.channel:
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed.set_footer(text=f"Member ID: {member.id}")
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
				elif not after.deaf:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **was server undeafened**')
					embed.set_author(name=member, icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
					if after.channel:
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed.set_footer(text=f"Member ID: {member.id}")
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
			if before.mute != after.mute:
				if after.mute:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **was server muted**')
					embed.set_author(name=member, icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
					if after.channel:
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed.set_footer(text=f"Member ID: {member.id}")
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
				elif not after.mute:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **was server unmuted**')
					embed.set_author(name=member, icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
					if after.channel:
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed.set_footer(text=f"Member ID: {member.id}")
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
			if before.self_video != after.self_video:
				if after.self_video:
					if after.channel:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **started sharing video in {after.channel.name}**')
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **started sharing video**')
						embed.set_footer(text=f"Member ID: {member.id}")
					embed.set_author(name=member, icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
				elif not after.self_video:
					if after.channel:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **stopped sharing video in {after.channel.name}**')
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **stopped sharing video**')
						embed.set_footer(text=f"Member ID: {member.id}")
					embed.set_author(name=member, icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
			if before.self_stream != after.self_stream:
				if after.self_stream:
					if after.channel:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **went live in {after.channel.name}**')
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **went live**')
						embed.set_footer(text=f"Member ID: {member.id}")
					embed.set_author(name=member, icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
				elif not after.self_stream:
					if after.channel:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **stopped being live in {after.channel.name}**')
						embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					else:
						embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **stopped being live**')
						embed.set_footer(text=f"Member ID: {member.id}")
					embed.set_author(name=member, icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
			if before.channel != after.channel:
				if before.channel and after.channel:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **switched voice channel**')
					embed.add_field(name='Before', value=before.channel.name, inline=False)
					embed.add_field(name='After', value=after.channel.name, inline=False)
					embed.set_author(name=member, icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
					embed.set_footer(text=f"Member ID: {member.id} | Old Channel ID: {before.channel.id} | New Channel ID: {after.channel.id}")
					try:
						return await logch.send(embed=embed)
					except Exception:
						pass
				if after.channel:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **joined voice channel {after.channel.name}**')
					embed.set_author(name=member, icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
					embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {after.channel.id}")
					try:
						return await logch.send(embed=embed)
					except Exception:
						pass
				elif not after.channel:
					embed = discord.Embed(color=member.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'{member.mention} **left voice channel {before.channel.name}**')
					embed.set_author(name=member, icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
					embed.set_footer(text=f"Member ID: {member.id} | Channel ID: {before.channel.id}")
					try:
						return await logch.send(embed=embed)
					except Exception:
						pass

	@commands.Cog.listener()
	async def on_guild_update(self, before, after):
		logch = self.bot.get_config(after).get('log.action')
		if logch:
			if before.name != after.name:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**Guild name was changed**')
				embed.add_field(name='Before', value=before.name, inline=False)
				embed.add_field(name='After', value=after.name, inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.description != after.description and after.id != 411619823445999637:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**Guild description was changed**')
				embed.add_field(name='Before', value=before.description, inline=False)
				embed.add_field(name='After', value=after.description, inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.region != after.region:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name}\'s region was changed**')
				embed.add_field(name='Before', value=region[str(before.region)], inline=False)
				embed.add_field(name='After', value=region[str(after.region)], inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.owner != after.owner:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name} was transferred to a new owner**')
				embed.add_field(name='Before', value=before.owner, inline=False)
				embed.add_field(name='After', value=after.owner, inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id} | Old Owner ID: {before.owner.id} | New Owner ID: {after.owner.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.verification_level != after.verification_level:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name}\'s verification level was changed**')
				embed.add_field(name='Before', value=str(before.verification_level).capitalize(), inline=False)
				embed.add_field(name='After', value=str(after.verification_level).capitalize(), inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.explicit_content_filter != after.explicit_content_filter:
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name}\'s content filter level was changed**')
				embed.add_field(name='Before', value=str(before.explicit_content_filter).capitalize().replace('_', ''), inline=False)
				embed.add_field(name='After', value=str(after.explicit_content_filter).capitalize().replace('_', ''), inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if set(before.features) != set(after.features):
				embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name}\'s features were updated**')
				s = set(after.features)
				removed = [x for x in before.features if x not in s]
				ignored = ['PREMIUM']
				[removed.remove(f) for f in ignored if f in removed]
				s = set(before.features)
				added = [x for x in after.features if x not in s]
				[added.remove(f) for f in ignored if f in added]
				if added:
					features = []
					for feature in added:
						features.append(f'> {feature}')
					embed.add_field(name='Added', value='\n'.join(features), inline=False)
				if removed:
					features = []
					for feature in removed:
						features.append(f'> {feature}')
					embed.add_field(name='Removed', value='\n'.join(features), inline=False)
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				if added or removed:
					try:
						await logch.send(embed=embed)
					except Exception:
						pass
			if before.banner != after.banner:
				if after.banner:
					embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name}\'s banner was changed**')
					embed.set_image(url=str(after.banner_url))
				else:
					embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name}\'s banner was removed**')
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.splash != after.splash:
				if after.splash:
					embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name}\'s splash was changed**')
					embed.set_image(url=str(after.splash_url))
				else:
					embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name}\'s splash was removed**')
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.discovery_splash != after.discovery_splash:
				if after.discovery_splash:
					embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name}\'s discovery splash was changed**')
					embed.set_image(url=str(after.discovery_splash_url))
				else:
					embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name}\'s discovery splash was removed**')
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.premium_tier != after.premium_tier:
				if after.premium_tier > before.premium_tier:
					embed = discord.Embed(color=discord.Color.from_rgb(255, 115, 250), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name} got boosted to Level {after.premium_tier}**')
				if after.premium_tier < before.premium_tier:
					embed = discord.Embed(color=discord.Color.from_rgb(255, 115, 250), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name} got weakened to Level {after.premium_tier}**')
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass
			if before.system_channel != after.system_channel:
				if after.system_channel:
					embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name}\'s system channel was changed to {after.system_channel.mention}**')
				else:
					embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{after.name}\'s system channel was removed**')
				embed.set_author(name=after.name, icon_url=str(after.icon_url))
				embed.set_footer(text=f"Guild ID: {after.id}")
				try:
					await logch.send(embed=embed)
				except Exception:
					pass

	@commands.Cog.listener()
	async def on_member_ban(self, guild, member):
		if f'{member.id}-{guild.id}' in self.recentgban:
			self.recentgban.remove(f'{member.id}-{guild.id}')
			return
		if member.guild.me.guild_permissions.view_audit_log:
			async for e in member.guild.audit_logs(limit=5):
				if e.action in [discord.AuditLogAction.kick, discord.AuditLogAction.ban] and e.target.id == member.id:
					if e.user == member.guild.me:
						return
		logch = self.bot.get_config(guild).get('log.action')
		if logch:
			embed = discord.Embed(color=member.color if member.color != discord.Color.default() else discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{member.mention} was banned**')
			embed.set_author(name=member, icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
			embed.set_footer(text=f"Member ID: {member.id}")
			try:
				await logch.send(embed=embed)
			except Exception:
				pass

	@commands.Cog.listener()
	async def on_member_unban(self, guild, member):
		logch = self.bot.get_config(guild).get('log.action')
		if logch:
			embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{member} was unbanned**')
			embed.set_author(name=member, icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
			embed.set_footer(text=f"Member ID: {member.id}")
			try:
				await logch.send(embed=embed)
			except Exception:
				pass

	@commands.Cog.listener()
	async def on_invite_create(self, invite: discord.Invite):
		guild = invite.guild
		if guild.id in self.bot.premium_guilds:
			await self.load_invites(guild.id)
		if not isinstance(guild, discord.Guild):
			return
		logch = self.bot.get_config(guild).get('log.action')
		if logch:
			embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**An invite was created**')
			embed.set_author(name=guild.name, icon_url=str(guild.icon_url_as(static_format='png', size=2048)))
			embed.add_field(name='Invite Code', value=invite.code, inline=False)
			embed.add_field(name='Max Uses', value=invite.max_uses, inline=False)
			embed.add_field(name='Temporary', value=invite.temporary, inline=False)
			if invite.temporary:
				delta = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=invite.max_age)
				if isinstance(delta, datetime.timedelta):
					embed.add_field(name='Expires in', value=humanfriendly.format_timespan(delta), inline=False)
			if isinstance(invite.channel, discord.abc.GuildChannel):
				embed.add_field(name='Channel', value=f'#{invite.channel.name}({invite.channel.id})', inline=False)
			if invite.inviter:
				embed.set_footer(text=f'Created by: {invite.inviter} ({invite.inviter.id})')
			try:
				await logch.send(embed=embed)
			except Exception:
				pass

	@commands.Cog.listener()
	async def on_invite_delete(self, invite: discord.Invite):
		guild = invite.guild
		if guild.id in self.bot.premium_guilds:
			await self.load_invites(guild.id)
		if not isinstance(guild, discord.Guild):
			return
		whodidit = None
		async for a in guild.audit_logs(action=discord.AuditLogAction.invite_delete, limit=1):
			if a.target.code == invite.code:
				whodidit = a.user
		logch = self.bot.get_config(guild).get('log.action')
		if logch:
			embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**An invite was deleted**')
			embed.set_author(name=guild.name, icon_url=str(guild.icon_url_as(static_format='png', size=2048)))
			embed.add_field(name='Invite Code', value=invite.code, inline=False)
			if isinstance(invite.channel, discord.abc.GuildChannel):
				embed.add_field(name='Channel', value=f'#{invite.channel.name}({invite.channel.id})', inline=False)
			if whodidit:
				embed.set_footer(text=f'Deleted by: {whodidit} ({whodidit.id})')
			try:
				await logch.send(embed=embed)
			except Exception:
				pass

	@commands.command(name='settings', aliases=['setup'], description='Configure my settings')
	@commands.has_permissions(manage_guild=True)
	@commands.bot_has_permissions(add_reactions=True, external_emojis=True)
	@commands.guild_only()
	async def gsettings(self, ctx):
		firesuccess = discord.utils.get(self.bot.emojis, id=674359197378281472)
		firefailed = discord.utils.get(self.bot.emojis, id=674359427830382603)
		await ctx.send('Hey, I\'m going to guide you through my settings. This shouldn\'t take long, there\'s only 6 options to configure')
		await asyncio.sleep(3)
		await ctx.send('First, we\'ll configure logging. Please give a channel for moderation logs or say `skip` to disable...')

		def modlog_check(message):
			if message.author != ctx.author:
				return False
			else:
				return True
		try:
			modlogsmsg = await self.bot.wait_for('message', timeout=30.0, check=modlog_check)
			if modlogsmsg.content.lower() != 'skip':
				try:
					modlogs = await TextChannel().convert(ctx, modlogsmsg.content)
				except commands.BadArgument:
					await ctx.error('Channel not found, moderation logs are now disabled.')
					modlogs = None
				else:
					await ctx.success(f'Setting moderation logs to {modlogs.mention}')
			else:
				await ctx.success('Skipping moderation logs...')
				modlogs = None
			await ctx.config.set('log.moderation', modlogs)
		except asyncio.TimeoutError:
			return await ctx.error(f'{ctx.author.mention}, you took too long. Stopping setup!')
		await asyncio.sleep(2)
		await ctx.send('Ok. Next we\'ll configure action logs. This is where actions such as deleted messages, edited messages etc. are logged.')
		await asyncio.sleep(2)
		await ctx.send('Please give a channel for action logs or say `skip` to disable...')
		def actionlog_check(message):
			if message.author != ctx.author:
				return False
			else:
				return True
		try:
			actionlogsmsg = await self.bot.wait_for('message', timeout=30.0, check=modlog_check)
			if actionlogsmsg.content.lower() != 'skip':
				try:
					actionlogs = await TextChannel().convert(ctx, actionlogsmsg.content)
				except commands.BadArgument:
					await ctx.error('Channel not found, action logs are now disabled.')
					actionlogs = None
				else:
					await ctx.success(f'Setting action logs to {actionlogs.mention}')
			else:
				await ctx.success('Skipping action logs...')
				actionlogs = None
			await ctx.config.set('log.action', actionlogs)
		except asyncio.TimeoutError:
			return await ctx.error(f'{ctx.author.mention}, you took too long. Stopping setup!')
		await asyncio.sleep(2)
		await ctx.send('Ok. Next is link deletion. Discord invites are enabled by default but you can enable more with `$linkfilter`')
		await asyncio.sleep(2)
		linkfiltermsg = await ctx.send(f'React with {firesuccess} to enable and {firefailed} to disable')
		await linkfiltermsg.add_reaction(firesuccess)
		await linkfiltermsg.add_reaction(firefailed)
		def linkfilter_check(reaction, user):
			if user != ctx.author:
				return False
			if reaction.emoji == firefailed and reaction.message.id == linkfiltermsg.id:
				return True
			if reaction.emoji == firesuccess and reaction.message.id == linkfiltermsg.id:
				return True
		try:
			reaction, user = await self.bot.wait_for('reaction_add', timeout=30.0, check=linkfilter_check)
			if reaction.emoji == firefailed:
				linkfilter = []
				await ctx.success('Disabling link filter...')
			elif reaction.emoji == firesuccess:
				linkfilter = ctx.config.get('mod.linkfilter')
				if not linkfilter:
					linkfilter = ['discord']
				await ctx.success(f'Enabling link filter. (If it was already enabled, your configuration won\'t change)')
			await ctx.config.set('mod.linkfilter', linkfilter)
		except asyncio.TimeoutError:
			return await ctx.error(f'{ctx.author.mention}, you took too long. Stopping setup!')
		await asyncio.sleep(2)
		await ctx.send('Ok. Now we\'re onto global bans. Fire uses the KSoft.Si API to check for naughty people. If enabled, I will ban any of these naughty people if they attempt to join.')
		await asyncio.sleep(2)
		gbansmsg = await ctx.send(f'React with {firesuccess} to enable and {firefailed} to disable')
		await gbansmsg.add_reaction(firesuccess)
		await gbansmsg.add_reaction(firefailed)
		def gban_check(reaction, user):
			if user != ctx.author:
				return False
			if reaction.emoji == firefailed and reaction.message.id == gbansmsg.id:
				return True
			if reaction.emoji == firesuccess and reaction.message.id == gbansmsg.id:
				return True
		try:
			reaction, user = await self.bot.wait_for('reaction_add', timeout=30.0, check=gban_check)
			if reaction.emoji == firefailed:
				globalbans = False
				await ctx.success('Disabling global ban check...')
			elif reaction.emoji == firesuccess:
				globalbans = True
				await ctx.success(f'Enabling global ban check')
			await ctx.config.set('mod.globalbans', globalbans)
		except asyncio.TimeoutError:
			return await ctx.error(f'{ctx.author.mention}, you took too long. Stopping setup!')
		await asyncio.sleep(2)
		await ctx.send('The penultimate setting, auto-decancer. This renames users with "cancerous" names (non-ascii)')
		await asyncio.sleep(2)
		autodcmsg = await ctx.send(f'React with {firesuccess} to enable and {firefailed} to disable')
		await autodcmsg.add_reaction(firesuccess)
		await autodcmsg.add_reaction(firefailed)
		def dc_check(reaction, user):
			if user != ctx.author:
				return False
			if reaction.emoji == firefailed and reaction.message.id == autodcmsg.id:
				return True
			if reaction.emoji == firesuccess and reaction.message.id == autodcmsg.id:
				return True
		try:
			reaction, user = await self.bot.wait_for('reaction_add', timeout=30.0, check=dc_check)
			if reaction.emoji == firefailed:
				audodc = False
				await ctx.success('Disabling auto decancer...')
			elif reaction.emoji == firesuccess:
				audodc = True
				await ctx.success(f'Enabling auto decancer')
			await ctx.config.set('mod.autodecancer', audodc)
		except asyncio.TimeoutError:
			return await ctx.error(f'{ctx.author.mention}, you took too long. Stopping setup!')
		await asyncio.sleep(2)
		await ctx.send('Finally, the last setting. Similar to the last one, auto-dehoist renames people with a non A-Z character at the start of their name.')
		await asyncio.sleep(2)
		autodhmsg = await ctx.send(f'React with {firesuccess} to enable and {firefailed} to disable')
		await autodhmsg.add_reaction(firesuccess)
		await autodhmsg.add_reaction(firefailed)
		def dh_check(reaction, user):
			if user != ctx.author:
				return False
			if reaction.emoji == firefailed and reaction.message.id == autodhmsg.id:
				return True
			if reaction.emoji == firesuccess and reaction.message.id == autodhmsg.id:
				return True
		try:
			reaction, user = await self.bot.wait_for('reaction_add', timeout=30.0, check=dh_check)
			if reaction.emoji == firefailed:
				audodh = False
				await ctx.success('Disabling auto dehoist...')
			elif reaction.emoji == firesuccess:
				audodh = True
				await ctx.success(f'Enabling auto dehoist')
			await ctx.config.set('mod.autodehoist', audodh)
		except asyncio.TimeoutError:
			return await ctx.error(f'{ctx.author.mention}, you took too long. Stopping setup!')
		await asyncio.sleep(2)
		await ctx.send('Nice! We\'re all good to go. I\'ll send a recap in a moment. I just need to reload settings.')
		config = ctx.config
		embed = discord.Embed(title=":gear: Guild Settings", colour=ctx.author.color, description="Here's a list of the current guild settings", timestamp=datetime.datetime.now(datetime.timezone.utc))
		embed.set_author(name=ctx.guild.name, icon_url=str(ctx.guild.icon_url))
		embed.add_field(name="Moderation Logs", value=config.get('log.moderation').mention if config.get('log.moderation') else 'Not set.', inline=False)
		embed.add_field(name="Action Logs", value=config.get('log.action').mention if config.get('log.action') else 'Not set.', inline=False)
		embed.add_field(name="Link Filter", value=",".join(config.get('mod.linkfilter')) or 'No filters enabled.', inline=False)
		embed.add_field(name="Global Ban Check (KSoft.Si API)", value=config.get('mod.globalbans'), inline=False)
		embed.add_field(name="Auto-Decancer", value=config.get('mod.autodecancer'), inline=False)
		embed.add_field(name="Auto-Dehoist", value=config.get('mod.autodehoist'), inline=False)
		await ctx.send(embed=embed)

	@commands.command(name='setlogs', aliases=['logging', 'log', 'logs'])
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def settings_logs(self, ctx, logtype: str = None, channel: TextChannel = None):
		if not logtype or logtype and logtype.lower() not in ['mod', 'moderation', 'action']:
			return await ctx.error(f'You must provide a log type, "moderation" or "action" for the log channel')
		logtype = logtype.lower()
		if logtype in ['mod', 'moderation']:
			if not channel:
				await ctx.config.set('log.moderation', None)
				return await ctx.success(f'Successfully reset the moderation logs channel.')
			else:
				await ctx.config.set('log.moderation', channel)
				return await ctx.success(f'Successfully set the moderation logs channel to {channel.mention}')
		if logtype == 'action':
			if not channel:
				await ctx.config.set('log.action', None)
				return await ctx.success(f'Successfully reset the action logs channel.')
			else:
				await ctx.config.set('log.action', channel)
				return await ctx.success(f'Successfully set the action logs channel to {channel.mention}')

	@commands.command(name='modonly', description='Set channels to be moderator only (users with `Manage Messages` are moderators')
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def modonly(self, ctx, channels: commands.Greedy[TextChannel] = []):
		current = ctx.config.get('commands.modonly')
		modonly = current.copy()
		for sf in channels:
			if sf not in modonly:
				modonly.append(sf)
		for sf in channels:
			if sf in current:
				modonly.remove(sf)
		current = await ctx.config.set('commands.modonly', modonly)
		channelmentions = [c.mention for c in current]
		if channelmentions:
			channellist = ', '.join(channelmentions)
			return await ctx.success(f'Commands can now only be run by moderators (those with Manage Messages permission) in:\n{channellist}.')
		return await ctx.success(f'Moderator only channels have been reset')

	@commands.command(name='adminonly', description='Set channels to be admin only (users with `Manage Server` are admins')
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def adminonly(self, ctx, channels: commands.Greedy[TextChannel] = []):
		current = ctx.config.get('commands.adminonly')
		adminonly = current.copy()
		for sf in channels:
			if sf not in current:
				adminonly.append(sf)
		for sf in channels:
			if sf in current:
				adminonly.remove(sf)
		current = await ctx.config.set('commands.adminonly', adminonly)
		channelmentions = [c.mention for c in current]
		if channelmentions:
			channellist = ', '.join(channelmentions)
			return await ctx.success(f'Commands can now only be run by admins (those with Manage Server permission) in;\n{channellist}.')
		return await ctx.success(f'Admin only channels have been reset')


	@commands.command(name='joinmsg', description='Set the channel and message for join messages')
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def joinmsg(self, ctx, channel: typing.Union[TextChannel, str] = None, *, message: str = None):
		variables = {
			'{user}': str(ctx.author),
			'{user.mention}': ctx.author.mention,
			'{user.name}': ctx.author.name,
			'{user.discrim}': ctx.author.discriminator,
			'{guild}': ctx.guild.name,
			'{server}': ctx.guild.name,
			'{count}': str(ctx.guild.member_count)
		}
		if not channel:
			joinmsg = ctx.config.get('greet.joinmsg')
			joinchan =  ctx.config.get('greet.joinchannel')
			if not joinmsg:
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'<:xmark:674359427830382603> Please provide a channel and message for join messages.')
				embed.add_field(name='Variables', value='\n'.join([f'{k}: {v}' for k, v in variables.items()]), inline=False)
				return await ctx.send(embed=embed)
			embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**Current Join Message Settings**\nDo __{ctx.prefix}joinmsg disable__ to disable join messages')
			embed.add_field(name='Channel', value=joinchan.mention if joinchan else 'Not Set (Not sure how you managed to do this)', inline=False)
			for k, v in variables.items():
				joinmsg = joinmsg.replace(k, v)
			embed.add_field(name='Message', value=joinmsg, inline=False)
			embed.add_field(name='Variables', value='\n'.join([f'{k}: {v}' for k, v in variables.items()]), inline=False)
			return await ctx.send(embed=embed)
		if isinstance(channel, str) and channel.lower() in ['off', 'disable', 'false']:
			joinmsg = ctx.config.get('greet.joinmsg')
			if not joinmsg:
				return await ctx.error('Can\'t disable something that wasn\'t enabled. ¯\_(ツ)_/¯')
			await ctx.config.set('greet.joinmsg', '')
			await ctx.config.set('greet.joinchannel', None)
			return await ctx.success(f'Successfully disabled join messages!')
		if isinstance(channel, str):
			return await ctx.error('You need to provide a valid channel')
		if not message:
			joinmsg = ctx.config.get('greet.joinmsg')
			if not joinmsg:
				return await ctx.error('You can\'t set a channel without setting a message.')
			await ctx.config.set('greet.joinchannel', channel)
			for k, v in variables.items():
				joinmsg = joinmsg.replace(k, v)
			return await ctx.success(f'Join messages will show in {channel.mention}!\nExample: {joinmsg}')
		else:
			await ctx.config.set('greet.joinmsg', message)
			await ctx.config.set('greet.joinchannel', channel)
			for k, v in variables.items():
				message = message.replace(k, v)
			return await ctx.success(f'Join messages will show in {channel.mention}!\nExample: {message}')

	@commands.command(name='leavemsg', description='Set the channel and message for leave messages')
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def leavemsg(self, ctx, channel: typing.Union[TextChannel, str] = None, *, message: str = None):
		variables = {
			'{user}': str(ctx.author),
			'{user.mention}': ctx.author.mention,
			'{user.name}': ctx.author.name,
			'{user.discrim}': ctx.author.discriminator,
			'{server}': ctx.guild.name,
			'{guild}': ctx.guild.name,
			'{count}': str(ctx.guild.member_count)
		}
		if not channel:
			leavemsg = ctx.config.get('greet.leavemsg')
			leavechan =  ctx.config.get('greet.leavechannel')
			if not leavemsg:
				embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'<:xmark:674359427830382603> Please provide a channel and message for leave messages.')
				embed.add_field(name='Variables', value='\n'.join([f'{k}: {v}' for k, v in variables.items()]), inline=False)
				return await ctx.send(embed=embed)
			embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**Current Leave Message Settings**\nDo __{ctx.prefix}leavemsg disable__ to disable leave messages')
			embed.add_field(name='Channel', value=leavechan.mention if leavechan else 'Not Set (Not sure how you managed to do this)', inline=False)
			for k, v in variables.items():
				leavemsg = leavemsg.replace(k, v)
			embed.add_field(name='Message', value=leavemsg, inline=False)
			embed.add_field(name='Variables', value='\n'.join([f'{k}: {v}' for k, v in variables.items()]), inline=False)
			return await ctx.send(embed=embed)
		if isinstance(channel, str) and channel.lower() in ['off', 'disable', 'false']:
			leavemsg = ctx.config.get('greet.leavemsg')
			if not leavemsg:
				return await ctx.error('Can\'t disable something that wasn\'t enabled. ¯\_(ツ)_/¯')
			await ctx.config.set('greet.leavemsg', '')
			await ctx.config.set('greet.leavechannel', None)
			return await ctx.success(f'Successfully disabled leave messages!')
		if isinstance(channel, str):
			return await ctx.error('You need to provide a valid channel')
		if not message:
			leavemsg = ctx.config.get('greet.leavemsg')
			if not leavemsg:
				return await ctx.error('You can\'t set a channel without setting a message.')
			await ctx.config.set('greet.leavechannel', channel)
			for k, v in variables.items():
				leavemsg = leavemsg.replace(k, v)
			return await ctx.success(f'Leave messages will show in {channel.mention}!\nExample: {leavemsg}')
		else:
			await ctx.config.set('greet.leavemsg', message)
			await ctx.config.set('greet.leavechannel', channel)
			for k, v in variables.items():
				message = message.replace(k, v)
			return await ctx.success(f'Leave messages will show in {channel.mention}!\nExample: {message}')

	@commands.command(name='linkfilter', description='Configure the link filter for this server', aliases=['linkfilters', 'linkblock'])
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def linkfiltercmd(self, ctx, *, enabled: str = None):
		options = ['discord', 'youtube', 'twitch', 'twitter', 'paypal', 'malware', 'shorteners', 'gifts']
		if not enabled:
			return await ctx.error(f'You must provide a valid filter(s). You can choose from {", ".join(options)}')
		enabled = enabled.split(' ')
		if any(e not in options for e in enabled):
			invalid = [e for e in enabled if e not in options]
			return await ctx.error(f'{", ".join(invalid)} are not valid filters')
		filtered = ctx.config.get('mod.linkfilter')
		for f in enabled:
			if f in filtered:
				filtered.remove(f)
			else:
				filtered.append(f)
		new = await ctx.config.set('mod.linkfilter', filtered)
		if new:
			return await ctx.success(f'Now filtering {", ".join(new)} links.')
		else:
			return await ctx.success(f'No longer filtering links')

	@commands.command(name='filterexcl', description='Exclude channels, roles and members from the filter')
	async def filterexclcmd(self, ctx, *ids: typing.Union[TextChannel, Role, Member]):
		current = ctx.config.get('excluded.filter')
		ids = [d.id for d in ids]
		for sf in ids:
			if sf not in current:
				ids.remove(sf)
				current.append(sf)
		for sf in current:
			if sf in ids:
				current.remove(sf)
		await ctx.config.set('excluded.filter', current)
		excl = []
		for sf in current:
			if ctx.guild.get_member(sf):
				excl.append(ctx.guild.get_member(sf))
			elif ctx.guild.get_role(sf):
				excl.append(ctx.guild.get_role(sf))
			elif ctx.guild.get_channel(sf):
				excl.append(ctx.guild.get_channel(sf))
			else:
				excl.append(sf)
		await ctx.success(f'Successfully set objects excluded from link filters\nExcluded: {", ".join([str(e) for e in excl])}')

	@commands.command(name='command', description='Enable and disable commands')
	@commands.has_permissions(manage_guild=True)
	@commands.guild_only()
	async def cmd(self, ctx, command: str = None):
		if not command:
			return await ctx.error('You must provide a command name')
		command = self.bot.get_command(command)
		if not command:
			return await ctx.error('You must provide a valid command')
		disabled = ctx.config.get('disabled.commands')
		if command.name in disabled:
			toggle = 'enabled'
			disabled.remove(command.name)
		else:
			toggle = 'disabled'
			disabled.append(command.name)
		await ctx.config.set('disabled.commands', disabled)
		return await ctx.success(f'{command.name} has been {toggle}.')

def setup(bot):
	bot.add_cog(Settings(bot))
	bot.logger.info(f'$GREENLoaded Settings/Events cog!')
