import asyncio
import datetime
import discord
import humanize
import itertools
import math
import random
import re
import wavelink
from collections import deque
from discord.ext import commands
from typing import Union

RURL = re.compile(r'https?:\/\/(?:www\.)?.+')


class Track(wavelink.Track):
	__slots__ = ('requester', 'channel', 'message')

	def __init__(self, id_, info, *, ctx=None):
		super(Track, self).__init__(id_, info)

		self.requester = ctx.author
		self.channel = ctx.channel
		self.message = ctx.message

	@property
	def is_dead(self):
		return self.dead


class Player(wavelink.Player):

	def __init__(self, bot: Union[commands.Bot, commands.AutoShardedBot], guild_id: int, node: wavelink.Node):
		super(Player, self).__init__(bot, guild_id, node)

		self.cmdchannel_id = None

		self.queue = asyncio.Queue()
		self.next_event = asyncio.Event()

		self.volume = 40
		self.dj = None
		self.controller_message = None
		self.reaction_task = None
		self.update = False
		self.updating = False
		self.inactive = False

		self.controls = {'⏯': 'rp',
						 '⏹': 'stop',
						 '⏭': 'skip',
						 '🔀': 'shuffle',
						 '🔂': 'repeat',
						 '➕': 'vol_up',
						 '➖': 'vol_down',
						 'ℹ': 'queue'}

		self.pauses = set()
		self.resumes = set()
		self.stops = set()
		self.shuffles = set()
		self.skips = set()
		self.repeats = set()

		self.eq = 'Flat'

		bot.loop.create_task(self.player_loop())
		bot.loop.create_task(self.updater())

	@property
	def entries(self):
		return list(self.queue._queue)

	async def updater(self):
		while not self.bot.is_closed():
			if self.update and not self.updating:
				self.update = False
				await self.invoke_controller()

			await asyncio.sleep(10)

	async def player_loop(self):
		await self.bot.wait_until_ready()

		await self.set_preq('Flat')
		# We can do any pre loop prep here...
		await self.set_volume(self.volume)

		while True:
			self.next_event.clear()

			self.inactive = False

			song = await self.queue.get()
			if not song:
				continue

			self.current = song
			self.paused = False

			await self.play(song)

			# Invoke our controller if we aren't already...
			if not self.update:
				await self.invoke_controller()

			# Wait for TrackEnd event to set our event...
			await self.next_event.wait()

			# Clear votes...
			self.pauses.clear()
			self.resumes.clear()
			self.stops.clear()
			self.shuffles.clear()
			self.skips.clear()
			self.repeats.clear()

	async def invoke_controller(self, track: wavelink.Track = None):
		"""Invoke our controller message, and spawn a reaction controller if one isn't alive."""
		if not track:
			track = self.current

		self.updating = True

		embed = discord.Embed(title='Music Controller',
							  description=f'<a:eq:557312295340998687> Now Playing:```ini\n{track.title}\n\n'
							  f'[EQ]: {self.eq}\n'
							  f'[Presets]: Flat/Boost/Piano/Metal```',
							  colour=0xffb347)
		embed.set_thumbnail(url=track.thumb)

		if track.is_stream:
			embed.add_field(name='Duration', value='🔴`Streaming`')
		else:
			embed.add_field(name='Duration', value=str(datetime.timedelta(milliseconds=int(track.length))))
		embed.add_field(name='Video URL', value=f'[Click Here!]({track.uri})')
		embed.add_field(name='Requested By', value=track.requester.mention)
		embed.add_field(name='Current DJ', value=self.dj.mention)
		embed.add_field(name='Queue Length', value=str(len(self.entries)))
		embed.add_field(name='Volume', value=f'**`{self.volume}%`**')

		if len(self.entries) > 0:
			data = '\n'.join(f'**-** `{t.title[0:45]}{"..." if len(t.title) > 45 else ""}`\n{"-"*10}'
							 for t in itertools.islice([e for e in self.entries if not e.is_dead], 0, 3, None))
			embed.add_field(name='Coming Up:', value=data, inline=False)

		if not await self.is_current_fresh(track.channel) and self.controller_message:
			try:
				await self.controller_message.delete()
			except discord.HTTPException:
				pass

			self.controller_message = await track.channel.send(embed=embed)
		elif not self.controller_message:
			self.controller_message = await track.channel.send(embed=embed)
		else:
			self.updating = False
			return await self.controller_message.edit(embed=embed, content=None)

		try:
			self.reaction_task.cancel()
		except Exception:
			pass

		self.reaction_task = self.bot.loop.create_task(self.reaction_controller())
		self.updating = False

	async def add_reactions(self):
		"""Add reactions to our controller."""
		for reaction in self.controls:
			try:
				await self.controller_message.add_reaction(str(reaction))
			except discord.HTTPException:
				return

	async def reaction_controller(self):
		"""Our reaction controller, attached to our controller.

		This handles the reaction buttons and it's controls.
		"""
		self.bot.loop.create_task(self.add_reactions())

		def check(r, u):
			if not self.controller_message:
				return False
			elif str(r) not in self.controls.keys():
				return False
			elif u.id == self.bot.user.id or r.message.id != self.controller_message.id:
				return False
			elif u not in self.bot.get_channel(int(self.channel_id)).members:
				return False
			return True

		while self.controller_message:
			if self.channel_id is None:
				return self.reaction_task.cancel()

			react, user = await self.bot.wait_for('reaction_add', check=check)
			control = self.controls.get(str(react))

			if control == 'rp':
				if self.paused:
					control = 'resume'
				else:
					control = 'pause'

			try:
				await self.controller_message.remove_reaction(react, user)
			except discord.HTTPException:
				pass
			cmd = self.bot.get_command(control)

			ctx = await self.bot.get_context(react.message)
			ctx.author = user

			try:
				if cmd.is_on_cooldown(ctx):
					pass
				if not await self.invoke_react(cmd, ctx):
					pass
				else:
					self.bot.loop.create_task(ctx.invoke(cmd))
			except Exception as e:
				ctx.command = self.bot.get_command('reactcontrol')
				await cmd.dispatch_error(ctx=ctx, error=e)

		await self.destroy_controller()

	async def destroy_controller(self):
		"""Destroy both the main controller and it's reaction controller."""
		try:
			await self.controller_message.delete()
			self.controller_message = None
		except (AttributeError, discord.HTTPException):
			pass

		try:
			self.reaction_task.cancel()
		except Exception:
			pass

	async def invoke_react(self, cmd, ctx):
		if not cmd._buckets.valid:
			return True

		if not (await cmd.can_run(ctx)):
			return False

		bucket = cmd._buckets.get_bucket(ctx)
		retry_after = bucket.update_rate_limit()
		if retry_after:
			return False
		return True

	async def is_current_fresh(self, chan):
		"""Check whether our controller is fresh in message history."""
		try:
			async for m in chan.history(limit=8):
				if m.id == self.controller_message.id:
					return True
		except (discord.HTTPException, AttributeError):
			return False
		return False


class Music(commands.Cog):
	"""Our main Music Cog."""

	def __init__(self, bot: Union[commands.Bot, commands.AutoShardedBot]):
		self.bot = bot

		if not hasattr(bot, 'wavelink'):
			self.bot.wavelink = wavelink.Client(bot)

		#bot.loop.create_task(self.initiate_nodes())

	@commands.Cog.listener()
	async def on_ready(self):
		main = wavelink.Client.get_node(self.bot.wavelink, identifier='MAIN')
		if not main:
			try:
				await self.initiate_nodes()
				print('Initiaded Lavalink nodes.')
			except wavelink.errors.NodeOccupied:
				pass

	async def initiate_nodes(self):
		nodes = {'MAIN': {'host': '127.0.0.1',
						  'port': 2333,
						  'rest_url': 'http://127.0.0.1:2333',
						  'password': "restfulapi",
						  'identifier': 'MAIN',
						  'region': 'eu_west'}}

		for n in nodes.values():
			node = await self.bot.wavelink.initiate_node(host=n['host'],
														 port=n['port'],
														 rest_uri=n['rest_url'],
														 password=n['password'],
														 identifier=n['identifier'],
														 region=n['region'],
														 secure=False)

			node.set_hook(self.event_hook)

	async def error_logger(self, event):
		player = event.player
		guild = self.bot.get_guild(player.guild_id)
		if guild:
			vc = discord.utils.get(guild.channels, id=player.channel_id)
			channel = discord.utils.get(guild.channels, id=player.cmdchannel_id)
		if not guild:
			guild = 'Unknown'
		if not vc:
			vc = 'Unknown'
		if not channel:
			channel = 'Unknown'
		track = event.track
		error = event.error
		errortb = ''.join(traceback.format_exception(type(error), error, error.__traceback__))
		message = f'```ini\n[Command Error Logger]\n\n[Guild] {guild}\n[Voice Channel] {vc}\n[Command Channel] {channel}\n[Track] {track}\n\n[Traceback]\n{errortb}```'
		messagenotb = f'```ini\n[Command Error Logger]\n\n[Guild] {guild}\n[Voice Channel] {vc}\n[Command Channel] {channel}\n[Track] {track}```'
		tbmessage = f'```ini\n[Traceback]\n{errortb}```'
		async with aiohttp.ClientSession() as session:
			webhook = Webhook.from_url('https://canary.discordapp.com/api/webhooks/589581080277811203/iSMsu5c37pMqAJozeDjv5HsR9lP8JJKcl57Px3-jD4QtkSuOaWV14hW33U5DGP5VFd5L', adapter=AsyncWebhookAdapter(session))
			try:
				await webhook.send(message, username='Music Error Logger')
			except discord.HTTPException:
				await webhook.send(messagenotb, username='Music Error Logger')
				await webhook.send(tbmessage, username='Music Error Logger')

	def event_hook(self, event):
		"""Our event hook. Dispatched when an event occurs on our Node."""
		if isinstance(event, wavelink.TrackEnd):
			event.player.next_event.set()
		elif isinstance(event, wavelink.TrackException):
			asyncio.run_coroutine_threadsafe(self.error_logger(event), self.bot.loop)

	def required(self, player, invoked_with):
		"""Calculate required votes."""
		channel = self.bot.get_channel(int(player.channel_id))
		if invoked_with == 'stop':
			if len(channel.members) - 1 == 2:
				return 2

		return math.ceil((len(channel.members) - 1) / 2.5)

	async def has_perms(self, ctx, **perms):
		"""Check whether a member has the given permissions."""
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		await self.bot.db.execute(f'SELECT * FROM blacklist WHERE uid = {ctx.author.id};')
		blacklist = await self.bot.db.fetchone()
		if blacklist != None:
			return False

		if ctx.author.id == player.dj.id:
			return True

		ch = ctx.channel
		permissions = ch.permissions_for(ctx.author)

		missing = [perm for perm, value in perms.items() if getattr(permissions, perm, None) != value]

		if not missing:
			return True

		return False

	async def vote_check(self, ctx, command: str):
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		vcc = len(self.bot.get_channel(int(player.channel_id)).members) - 1
		votes = getattr(player, command + 's', None)

		if vcc < 3 and not ctx.invoked_with == 'stop':
			votes.clear()
			return True
		else:
			votes.add(ctx.author.id)

			if len(votes) >= self.required(player, ctx.invoked_with):
				votes.clear()
				return True
		return False

	async def do_vote(self, ctx, player, command: str):
		attr = getattr(player, command + 's', None)
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		if ctx.author.id in attr:
			await ctx.send(f'{ctx.author.mention}, you have already voted to {command}!', delete_after=15)
		elif await self.vote_check(ctx, command):
			await ctx.send(f'Vote request for {command} passed!', delete_after=20)
			to_do = getattr(self, f'do_{command}')
			await to_do(ctx)
		else:
			await ctx.send(f'{ctx.author.mention}, has voted to {command} the song!'
						   f' **{self.required(player, ctx.invoked_with) - len(attr)}** more votes needed!',
						   delete_after=45)

	@commands.command(name='reactcontrol', hidden=True, description="Dummy command for error handling")
	async def react_control(self, ctx):
		"""None"""
		pass

	@commands.command(name='connect', aliases=['join'], description="Connect to a voice channel")
	async def connect_(self, ctx, *, channel: discord.VoiceChannel = None):
		"""PFXconnect <channel>"""
		try:
			await ctx.message.delete()
		except discord.HTTPException:
			pass

		if not channel:
			try:
				channel = ctx.author.voice.channel
			except AttributeError:
				raise commands.UserInputError('No channel to join. Please either specify a valid channel or join one.')

		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		if player.is_connected:
			if ctx.author.voice.channel == ctx.guild.me.voice.channel:
				return

		await player.connect(channel.id)
		player.cmdchannel_id = ctx.channel.id

	@commands.command(name='play', aliases=['sing'], description="Queue a song or playlist for playback.")
	@commands.cooldown(1, 2, commands.BucketType.user)
	async def play_(self, ctx, *, query: str):
		"""PFXplay <search query|url>"""
		await ctx.trigger_typing()

		await ctx.invoke(self.connect_)
		query = query.strip('<>')

		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		if not player.is_connected:
			return await ctx.send('Bot is not connected to voice. Please join a voice channel to play music.')

		if not player.dj:
			player.dj = ctx.author

		if not RURL.match(query):
			query = f'ytsearch:{query}'
		try:
			tracks = await self.bot.wavelink.get_tracks(query)
		except Exception:
			await self.do_stop(ctx)
			self.bot.wavelink.nodes = {}
			await self.initiate_nodes()
			tracks = await self.bot.wavelink.get_tracks(query)
		if not tracks:
			return await ctx.send('No songs were found with that query. Please try again.')

		if isinstance(tracks, wavelink.TrackPlaylist):
			for t in tracks.tracks:
				await player.queue.put(Track(t.id, t.info, ctx=ctx))

			await ctx.send(f'```ini\nAdded the playlist {tracks.data["playlistInfo"]["name"]}'
						   f' with {len(tracks.tracks)} songs to the queue.\n```')
		else:
			track = tracks[0]
			await ctx.send(f'```ini\nAdded {track.title} to the Queue\n```', delete_after=15)
			await player.queue.put(Track(track.id, track.info, ctx=ctx))

		if player.controller_message and player.is_playing:
			await player.invoke_controller()
		player.cmdchannel_id = ctx.channel.id

	@commands.command(name='np', aliases=['now_playing', 'current', 'currentsong'], description="Sends the music controller message which contains various information about the current and upcoming songs.")
	@commands.cooldown(2, 15, commands.BucketType.user)
	async def now_playing(self, ctx):
		"""PFXnp"""
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)
		if not player:
			return

		if not player.is_connected:
			return

		if player.updating or player.update:
			return

		await player.invoke_controller()

	@commands.command(name='pause', description="Pause the currently playing song.")
	async def pause_(self, ctx):
		"""PFXpause"""
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)
		if not player:
			return

		if not player.is_connected:
			await ctx.send('I am not currently connected to voice!')

		if player.paused:
			return

		if await self.has_perms(ctx, manage_guild=True):
			await ctx.send(f'{ctx.author.mention} has paused the song as an admin or DJ.', delete_after=25)
			return await self.do_pause(ctx)

		await self.do_vote(ctx, player, 'pause')
		player.cmdchannel_id = ctx.channel.id

	async def do_pause(self, ctx):
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)
		player.paused = True
		await player.set_pause(True)

	@commands.command(name='resume', description="Resume a currently paused song.")
	async def resume_(self, ctx):
		"""PFXresume"""
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		if not player.is_connected:
			await ctx.send('I am not currently connected to voice!')

		if not player.paused:
			return

		if await self.has_perms(ctx, manage_guild=True):
			await ctx.send(f'{ctx.author.mention} has resumed the song as an admin or DJ.', delete_after=25)
			return await self.do_resume(ctx)

		await self.do_vote(ctx, player, 'resume')
		player.cmdchannel_id = ctx.channel.id

	async def do_resume(self, ctx):
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)
		await player.set_pause(False)

	@commands.command(name='skip', description="Skip the current song.")
	@commands.cooldown(5, 10, commands.BucketType.user)
	async def skip_(self, ctx):
		"""PFXskip"""
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		if not player.is_connected:
			return await ctx.send('I am not currently connected to voice!')

		if await self.has_perms(ctx, manage_guild=True):
			await ctx.send(f'{ctx.author.mention} has skipped the song as an admin or DJ.', delete_after=25)
			return await self.do_skip(ctx)

		if player.current.requester.id == ctx.author.id:
			await ctx.send(f'The requester {ctx.author.mention} has skipped the song.')
			return await self.do_skip(ctx)

		await self.do_vote(ctx, player, 'skip')
		player.cmdchannel_id = ctx.channel.id

	async def do_skip(self, ctx):
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		await player.stop()

	@commands.command(name='stop', description="Stop the player, disconnect and clear the queue.")
	@commands.cooldown(3, 30, commands.BucketType.guild)
	async def stop_(self, ctx):
		"""PFXstop"""
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		if not player.is_connected:
			return await ctx.send('I am not currently connected to voice!')

		if await self.has_perms(ctx, manage_guild=True):
			await ctx.send(f'{ctx.author.mention} has stopped the player as an admin or DJ.', delete_after=25)
			return await self.do_stop(ctx)

		await self.do_vote(ctx, player, 'stop')
		player.cmdchannel_id = ctx.channel.id

	async def do_stop(self, ctx):
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		await player.destroy_controller()
		await player.destroy()
		await player.disconnect()

	@commands.command(name='volume', aliases=['vol'], description="Change the player volume.")
	@commands.cooldown(1, 2, commands.BucketType.guild)
	async def volume_(self, ctx, *, value: int):
		"""PFXvolume <number: 1-100>"""
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		if not player.is_connected:
			return await ctx.send('I am not currently connected to voice!')

		if not 0 < value < 101:
			return await ctx.send('Please enter a value between 1 and 100.')

		if not await self.has_perms(ctx, manage_guild=True) and player.dj.id != ctx.author.id:
			if (len(player.connected_channel.members) - 1) > 2:
				return

		await player.set_volume(value)
		await ctx.send(f'Set the volume to **{value}**%', delete_after=7)

		if not player.updating and not player.update:
			await player.invoke_controller()
		player.cmdchannel_id = ctx.channel.id

	@commands.command(name='queue', aliases=['q', 'que'], description="Retrieve a list of currently queued songs.")
	@commands.cooldown(1, 10, commands.BucketType.user)
	async def queue_(self, ctx):
		"""PFXqueue"""
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		if not player.is_connected:
			return await ctx.send('I am not currently connected to voice!')

		upcoming = list(itertools.islice(player.entries, 0, 10))

		if not upcoming:
			return await ctx.send('```\nNo more songs in the Queue!\n```', delete_after=15)

		fmt = '\n'.join(f'**`{str(song)}`**' for song in upcoming)
		embed = discord.Embed(title=f'Upcoming - Next {len(upcoming)}', description=fmt)

		await ctx.send(embed=embed)
		player.cmdchannel_id = ctx.channel.id

	@commands.command(name='shuffle', aliases=['mix'], description="Shuffle the current queue.")
	@commands.cooldown(2, 10, commands.BucketType.user)
	async def shuffle_(self, ctx):
		"""PFXshuffle"""
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		if not player.is_connected:
			return await ctx.send('I am not currently connected to voice!')

		if len(player.entries) < 3:
			return await ctx.send('Please add more songs to the queue before trying to shuffle.', delete_after=10)

		if await self.has_perms(ctx, manage_guild=True):
			await ctx.send(f'{ctx.author.mention} has shuffled the playlist as an admin or DJ.', delete_after=25)
			return await self.do_shuffle(ctx)

		await self.do_vote(ctx, player, 'shuffle')
		player.cmdchannel_id = ctx.channel.id

	async def do_shuffle(self, ctx):
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)
		random.shuffle(player.queue._queue)

		player.update = True

	@commands.command(name='repeat', description="Repeat the currently playing song.")
	async def repeat_(self, ctx):
		"""PFXrepeat"""
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		if not player.is_connected:
			return

		if await self.has_perms(ctx, manage_guild=True):
			await ctx.send(f'{ctx.author.mention} has repeated the song as an admin or DJ.', delete_after=25)
			return await self.do_repeat(ctx)

		await self.do_vote(ctx, player, 'repeat')
		player.cmdchannel_id = ctx.channel.id

	async def do_repeat(self, ctx):
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		if not player.entries:
			await player.queue.put(player.current)
		else:
			player.queue._queue.appendleft(player.current)

		player.update = True

	@commands.command(name='vol_up', hidden=True, description="Turn up the volume.")
	async def volume_up(self, ctx):
		"""None"""
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		if not player.is_connected:
			return

		vol = int(math.ceil((player.volume + 10) / 10)) * 10

		if vol > 100:
			vol = 100
			await ctx.send('Maximum volume reached', delete_after=7)

		await player.set_volume(vol)
		player.update = True

	@commands.command(name='vol_down', hidden=True, description="Turn the volume down.")
	async def volume_down(self, ctx):
		"""None"""
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		if not player.is_connected:
			return

		vol = int(math.ceil((player.volume - 10) / 10)) * 10

		if vol < 0:
			vol = 0
			await ctx.send('Player is currently muted', delete_after=10)

		await player.set_volume(vol)
		player.update = True

	@commands.command(name='seteq', description="Pick from one of the equalizer presets to change your music.")
	async def set_eq(self, ctx, *, eq: str):
		"""PFXseteq <Flat|Boost|Metal|Piano>"""
		player = self.bot.wavelink.get_player(ctx.guild.id, cls=Player)

		if eq.upper() not in player.equalizers:
			return await ctx.send(f'`{eq}` - Is not a valid equalizer!\nTry Flat, Boost, Metal, Piano.')

		await player.set_preq(eq)
		player.eq = eq.capitalize()
		await ctx.send(f'The player Equalizer was set to - {eq.capitalize()}')
		player.cmdchannel_id = ctx.channel.id

def setup(bot):
	bot.add_cog(Music(bot))