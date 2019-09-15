from discord.ext import commands
import discord
import os
import asyncio
import json
import click
import functools
import datetime
import wavelink
from jishaku.cog import copy_context_with
from cogs.music import Player as MusicPlayer
from cogs.music import Track as MusicTrack
import google.auth.transport.grpc
import google.auth.transport.requests
import google.oauth2.credentials
from google.assistant.embedded.v1alpha2 import (
	embedded_assistant_pb2,
	embedded_assistant_pb2_grpc
)

try:
	from .amodules import (
		assistant_helpers,
		browser_helpers,
		audio_helpers
	)
except (SystemError, ImportError):
	import assistant_helpers
	import browser_helpers
	import audio_helpers

print('assist.py has been loaded.')
ASSISTANT_API_ENDPOINT = 'embeddedassistant.googleapis.com'
DEFAULT_GRPC_DEADLINE = 60 * 3 + 5
PLAYING = embedded_assistant_pb2.ScreenOutConfig.PLAYING

class GoogleAssistant(object):
	def __init__(self, language_code, device_model_id, device_id,
				 display, channel, deadline_sec):
		self.language_code = language_code
		self.device_model_id = device_model_id
		self.device_id = device_id
		self.conversation_state = None
		self.is_new_conversation = True
		self.display = display
		self.assistant = embedded_assistant_pb2_grpc.EmbeddedAssistantStub(
			channel
		)
		self.deadline = deadline_sec

	def __enter__(self):
		return self

	def __exit__(self, etype, e, traceback):
		if e:
			return False

	def assist(self, text_query, conversation_stream):
		"""Send a text request to the Assistant and playback the response.
		"""
		def iter_assist_requests():
			config = embedded_assistant_pb2.AssistConfig(
				audio_out_config=embedded_assistant_pb2.AudioOutConfig(
					encoding='LINEAR16',
					sample_rate_hertz=16000,
					volume_percentage=0,
				),
				dialog_state_in=embedded_assistant_pb2.DialogStateIn(
					language_code=self.language_code,
					conversation_state=self.conversation_state,
					is_new_conversation=self.is_new_conversation,
				),
				device_config=embedded_assistant_pb2.DeviceConfig(
					device_id=self.device_id,
					device_model_id=self.device_model_id,
				),
				text_query=text_query,
			)
			# Continue current conversation with later requests.
			self.is_new_conversation = False
			if self.display:
				config.screen_out_config.screen_mode = PLAYING
			req = embedded_assistant_pb2.AssistRequest(config=config)
			assistant_helpers.log_assist_request_without_audio(req)
			yield req

		text_response = None
		html_response = None
		for resp in self.assistant.Assist(iter_assist_requests(),
										  self.deadline):
			assistant_helpers.log_assist_response_without_audio(resp)
			conversation_stream.write(resp.audio_out.audio_data)
			if resp.screen_out.data:
				html_response = resp.screen_out.data
			if resp.dialog_state_out.conversation_state:
				conversation_state = resp.dialog_state_out.conversation_state
				self.conversation_state = conversation_state
			if resp.dialog_state_out.supplemental_display_text:
				text_response = resp.dialog_state_out.supplemental_display_text
		return text_response, html_response

try:
	with open(os.path.join(click.get_app_dir('google-oauthlib-tool'), 'credentials.json'), 'r') as f:
		credentials = google.oauth2.credentials.Credentials(token=None,
															**json.load(f))
		http_request = google.auth.transport.requests.Request()
		credentials.refresh(http_request)
except Exception as e:
	print('Failed to connect to Google Assistant. ')
	credentials = None

grpc_channel = google.auth.transport.grpc.secure_authorized_channel(credentials, http_request, ASSISTANT_API_ENDPOINT)
gassistant = GoogleAssistant('en-us', 'fire0682-444871677176709141', '287698408855044097', True, grpc_channel, DEFAULT_GRPC_DEADLINE)

class Assistant(commands.Cog, name='Google Assistant'):
	def __init__(self, bot):
		self.bot = bot

	@commands.command(description="Ask the Google Assistant a question and hear the response in your voice channel!")
	# @commands.cooldown(1, 12, commands.BucketType.user)
	async def gassist(self, ctx, *, query):
		'''PFXgassist <query>'''
		await ctx.channel.trigger_typing()
		loop = self.bot.loop
		vc = True
		uploadresp = False
		player = False
		try:
			if not ctx.author.voice.channel:
				vc = False
				uploadresp = True
				#return await ctx.send('You must be in a voice channel to use this!')
		except AttributeError:
			vc = False
			uploadresp = True
			#return await ctx.send('You must be in a voice channel to use this!')
		if vc:
			player = self.bot.wavelink.get_player(ctx.guild.id, cls=MusicPlayer)
			player.gassist = True
		if player:
			if isinstance(player.current, MusicTrack):
				uploadresp = True
				#return await ctx.send('I\'m currently playing music so I can\'t play the response.')
		try:
			audio_sink = audio_helpers.WaveSink(
				open(f'{ctx.author.id}.mp3', 'wb'),
				sample_rate=16000,
				sample_width=2
			)
			stream = audio_helpers.ConversationStream(
				source=None,
				sink=audio_sink,
				iter_size=3200,
				sample_width=2,
			)
			await loop.run_in_executor(None, func=functools.partial(gassistant.assist, query, stream))
			if os.path.exists(f'{ctx.author.id}.mp3'):
				if uploadresp == True:
					file = discord.File(f'{ctx.author.id}.mp3', 'gassist.mp3')
					await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'gassist.uploaded'))
					return await ctx.send(file=file)
				alt_ctx = await copy_context_with(ctx, content=ctx.prefix + f'play {ctx.author.id}.mp3')
				await alt_ctx.command.reinvoke(alt_ctx)
				await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.increment, 'gassist.played'))
				await asyncio.sleep(3)
				track = player.current
				if track == None:
					await player.destroy_controller()
					await player.destroy()
					await player.disconnect()
					return
				if track.title == 'Unknown title':
					length = track.length / 1000
					await asyncio.sleep(length)
					await player.destroy_controller()
					await player.destroy()
					await player.disconnect()
		except Exception as e:
			raise e

def setup(bot):
	if credentials:
		bot.add_cog(Assistant(bot))
	else:
		raise commands.DiscordException('Coudln\'t connect to Google Assistant! Unloading cog.')