from discord.ext import commands
import discord
import os
import asyncio
import json
import click
import functools
import datetime
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

	def screenshot(self, fileid):
		DRIVER = 'chromedriver'
		driver = webdriver.Chrome(DRIVER)
		driver.set_window_size(2160, 1440)
		driver.get('chrome://settings/')
		driver.execute_script('chrome.settingsPrivate.setDefaultZoom(0.75);')
		driver.get(f'https://gaminggeek.club/{fileid}.html')
		driver.execute_script('document.body.style.backgroundImage = "url(\'https://picsum.photos/1920/1080/?blur\')";')
		try:
			driver.execute_script('document.getElementById(\'suggestion_header\').innerHTML = \'Try typing...\';')
		except Exception:
			pass
		#driver.execute_script("document.body.style.backgroundColor = '#36393F';")
		#driver.execute_script("document.getElementById('assistant-shadow').remove();")
		screenshot = driver.save_screenshot(f'assist{fileid}.png')
		driver.quit()

	def getresponse(self, html: str):
		resptxt = html.split("class=\"show_text_content\">")[1].split('</div>')[0]
		respsuggest = []
		for i in range(1, 6):
			if f"suggestion_{i}" in html:
				suggestion = html.split(f"id=\"suggestion_{i}\">")[1].split('</button>')[0]
				print(suggestion)
				respsuggest.append(suggestion)
		return resptxt, respsuggest

	@commands.command(description="Ask the Google Assistant a question!\n\nNote: It currently takes ~10 seconds for the response as this feature is in beta")
	# @commands.cooldown(1, 12, commands.BucketType.user)
	async def gassist(self, ctx, *, query):
		'''PFXgassist <query>'''
		await ctx.channel.trigger_typing()
		loop = self.bot.loop
		try:
			response_text, response_html = await loop.run_in_executor(None, func=functools.partial(gassistant.assist, query))
		except Exception:
			raise commands.CommandError('Something went wrong.')
		with open(f'C:/Users/Administrator/Documents/Geek/gaminggeek.club/gassisttest.html', 'wb') as f:
			f.write(response_html)
		resptxt, respsuggest = self.getresponse(str(response_html))
		if resptxt != None:
			embed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
			embed.set_author(name="Google Assistant", url="https://assistant.google.com/", icon_url="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Google_Assistant_logo.svg/1200px-Google_Assistant_logo.svg.png")
			embed.add_field(name="You said...", value=query, inline=False)
			embed.add_field(name="Google Assistant said...", value=resptxt.decode('UTF-8'), inline=False)
			if respsuggest:
				embed.add_field(name="Try asking...", value=', '.join(respsuggest), inline=False)
			await ctx.send(embed=embed)
		else:
			embed = discord.Embed(colour=ctx.author.color, timestamp=datetime.datetime.utcnow())
			embed.set_author(name="Google Assistant", url="https://assistant.google.com/", icon_url="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Google_Assistant_logo.svg/1200px-Google_Assistant_logo.svg.png")
			embed.add_field(name="You said...", value=query, inline=False)
			embed.add_field(name="Google Assistant said...", value="Sorry, I can't help with that on this device.", inline=False)
			await ctx.send(embed=embed)
			with open(f'C:/Users/Administrator/Documents/Geek/gaminggeek.club/gassisttest.html', 'wb') as f:
				f.write(response_html)
			# await loop.run_in_executor(None, func=functools.partial(self.screenshot, f'{ctx.author.name}-{ctx.author.id}'))
			# img = discord.File(f'assist{ctx.author.name}-{ctx.author.id}.png', 'gassist.png')
			# await ctx.send(file=img)
			# try:
			# 	os.remove(f'assist{ctx.author.name}-{ctx.author.id}.png')
			# 	os.remove(f'C:/Users/Administrator/Documents/Geek/gaminggeek.club/{ctx.author.name}-{ctx.author.id}.html')
			# except Exception:
			# 	pass

def setup(bot):
	if credentials:
		bot.add_cog(Assistant(bot))
	else:
		raise commands.DiscordException('Coudln\'t connect to Google Assistant! Unloading cog.')