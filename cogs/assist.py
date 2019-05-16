from discord.ext import commands
import discord
import os
import asyncio
import json
import click
import functools
from selenium import webdriver
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
	)
except (SystemError, ImportError):
	import assistant_helpers
	import browser_helpers

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

	def assist(self, text_query):
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

	def assistquery(self, query):
		response_text, response_html = gassistant.assist(text_query=query)
		return response_text

	def screenshot(self):
		DRIVER = 'chromedriver'
		driver = webdriver.Chrome(DRIVER)
		driver.set_window_size(2160, 1440)
		driver.get('chrome://settings/')
		driver.execute_script('chrome.settingsPrivate.setDefaultZoom(0.75);')
		driver.get('https://gaminggeek.club/google-assistant-sdk-screen-out.html')
		driver.execute_script('document.body.style.backgroundImage = "url(\'https://picsum.photos/1920/1080/?blur\')";')
		driver.execute_script('document.getElementById(\'suggestion_header\').innerHTML = \'Try typing...\';')
		#driver.execute_script("document.body.style.backgroundColor = '#36393F';")
		#driver.execute_script("document.getElementById('assistant-shadow').remove();")
		screenshot = driver.save_screenshot('assistresp.png')
		driver.quit()

	@commands.command()
	async def gassist(self, ctx, *, query):
		await ctx.channel.trigger_typing()
		loop = self.bot.loop
		response_text, response_html = await loop.run_in_executor(None, func=functools.partial(gassistant.assist, query))
		with open('C:/Users/Administrator/Documents/Geek/gaminggeek.club/google-assistant-sdk-screen-out.html', 'wb') as f:
			f.write(response_html)
		await loop.run_in_executor(None, func=self.screenshot)
		img = discord.File('assistresp.png', 'gassist.png')
		await ctx.send(file=img)
		return

def setup(bot):
	if credentials:
		bot.add_cog(Assistant(bot))
	else:
		raise commands.DiscordException('Coudln\'t connect to Google Assistant! Unloading cog.')