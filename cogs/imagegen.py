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

from imageutils.textutils import wrap, render_text_with_emoji
from PIL import Image, ImageDraw, ImageFont
from fire.converters import Member
from discord.ext import commands
from random import randint
from io import BytesIO
import functools
import aiohttp
import discord
import typing
import json
import os

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
def get_path(path):
	return os.path.join(ROOT_DIR, path)

class ImageGeneration(commands.Cog, name='Image Generation'):
	def __init__(self, bot):
		self.bot = bot

	@commands.command(name='makeameme')
	async def meme(self, ctx, image: typing.Union[Member, str] = None, *, text: str = None):
		if ctx.message.attachments:
			if isinstance(image, discord.Member):
				image = image.name
			text = f'{image} {text or ""}'
			image = ctx.message.attachments[0].url
		if not image:
			return await ctx.error('You need to provide an image')
		if isinstance(image, discord.Member):
			image = str(image.avatar_url_as(format='png'))
		image = image.strip('<>')
		if 'cdn.discordapp.com' in image and not '?size=' in image:
			image = image + '?size=2048'
		if '.gif' in image:
			return await ctx.error('Animated images are not supported!')
		if not text:
			return await ctx.error('You must provide text seperated by **|**')
		if len(text.split('|')) <= 1:
			return await ctx.error('You must provide text seperated by **|**')
		try:
			async with aiohttp.ClientSession() as s:
				imgraw = await s.get(image)
				if imgraw.status != 200:
					return await ctx.error('Invalid image!')
				imgraw = await imgraw.read()
				await s.close()
		except Exception:
			return await ctx.error('Invalid image!')
		try:
			img = Image.open(BytesIO(imgraw))
		except Exception:
			return await ctx.error('Invalid image!')
		img.seek(0)
		factor = int(img.height / 10)
		color = 'white'
		font = ImageFont.truetype(get_path("static/font/impact.ttf"), factor)
		draw = ImageDraw.Draw(img)
		text = text.split('|')

		def draw_text_with_outline(string, x, y):
			x = int(x)
			y = int(y)
			render_text_with_emoji(img, draw, (x - 2, y - 2), string, font=font, fill=(0, 0, 0))
			render_text_with_emoji(img, draw, (x + 2, y - 2), string, font=font, fill=(0, 0, 0))
			render_text_with_emoji(img, draw, (x + 2, y + 2), string, font=font, fill=(0, 0, 0))
			render_text_with_emoji(img, draw, (x - 2, y + 2), string, font=font, fill=(0, 0, 0))
			render_text_with_emoji(img, draw, (x, y), string, font=font, fill=color)

		def draw_text(string, pos):
			string = string.upper()
			w, h = draw.textsize(string, font)  # measure the size the text will take

			line_count = 1
			if w > img.width:
				line_count = int(round((w / img.width) + 1))

			lines = []
			if line_count > 1:

				last_cut = 0
				is_last = False
				for i in range(0, line_count):
					if last_cut == 0:
						cut = int((len(string) / line_count) * i)
					else:
						cut = int(last_cut)

					if i < line_count - 1:
						next_cut = int((len(string) / line_count) * (i + 1))
					else:
						next_cut = len(string)
						is_last = True

					# make sure we don't cut words in half
					if not next_cut == len(text) or not text[next_cut] == " ":
						try:
							while string[next_cut] != " ":
								next_cut += 1
						except IndexError:
							next_cut = next_cut - 1

					line = string[cut:next_cut].strip()

					# is line still fitting ?
					w, h = draw.textsize(line, font)
					if not is_last and w > img.width:
						next_cut -= 1
						while string[next_cut] != " ":
							next_cut -= 1

					last_cut = next_cut
					lines.append(string[cut:next_cut + 1].strip())

			else:
				lines.append(string)

			last_y = -h
			if pos == "bottom":
				last_y = img.height - h * (line_count + 1) - 10

			for i in range(0, line_count):
				w, h = draw.textsize(lines[i], font)
				x = img.width / 2 - w / 2
				y = last_y + h
				draw_text_with_outline(lines[i], x, y)
				last_y = y

		try:
			await self.bot.loop.run_in_executor(None, functools.partial(draw_text, text[0], "top"))
			await self.bot.loop.run_in_executor(None, functools.partial(draw_text, text[1], "bottom"))
		except Exception:
			return await ctx.error('Invalid image!')

		# img.save(f'ttbt{ctx.author.id}.png')
		buf = BytesIO()
		img.save(buf, format='PNG')
		buf.seek(0)
		# raw = buf.getvalue()
		file = discord.File(buf, f'spicymeme.png')
		await ctx.send(file=file)
		# os.remove(f'ttbt{ctx.author.id}.png')

	@commands.command(name='deepfry', aliases=['df'])
	async def df(self, ctx, image: typing.Union[Member, str] = None):
		if not image:
			if len(ctx.message.attachments) >= 1:
				image = ctx.message.attachments[0].url
			else:
				image = str(ctx.author.avatar_url_as(format='png'))
		if type(image) == discord.Member:
			image = str(image.avatar_url_as(format='png'))
		image = image.strip('<>')
		async with aiohttp.ClientSession(
			headers={'Authorization': self.bot.config["aeromeme"]}
		) as s:
			imgraw = await s.get(f'https://memes.aero.bot/api/deepfry?avatar1={image}')
			if imgraw.status != 200:
				return await ctx.error('Something went wrong...')
			imgraw = await imgraw.read()
			await s.close()
		# img = Image.open(BytesIO(imgraw))
		# img.save(f'deepfry{ctx.author.id}.png')
		file = discord.File(BytesIO(imgraw), f'deepfried.png')
		await ctx.send(file=file)
		# os.remove(f'deepfry{ctx.author.id}.png')


def setup(bot):
	bot.add_cog(ImageGeneration(bot))
