import dbl
import discord
from discord.ext import commands
import json
import aiohttp
import asyncio
import logging

with open('config.json', 'r') as cfg:
	config = json.load(cfg)

logging.basicConfig(filename='bot.log',level=logging.INFO)

class DiscordBotsOrgAPI(commands.Cog):
	"""Handles interactions with the discordbots.org API"""

	def __init__(self, bot):
		self.bot = bot
		self.token = config['dbl']
		self.dblpy = dbl.Client(self.bot, self.token)
		self.bot.loop.create_task(self.update_stats())

	async def update_stats(self):
		"""This function runs every 30 minutes to automatically update your server count"""

		while True:
			logging.info('Attempting to post server count')
			try:
				await self.dblpy.post_server_count()
				logging.info(f'Posted server count ({len(self.bot.guilds)})')
			except Exception as e:
				logging.exception(f'Failed to post server count\n{type(e).__name__}: {e}')
			await asyncio.sleep(1800)

def setup(bot):
	bot.add_cog(DiscordBotsOrgAPI(bot))