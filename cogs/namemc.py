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
from discord.ext import commands
from jishaku.paginators import WrappedPaginator, PaginatorEmbedInterface, PaginatorInterface
import dateutil.parser
import datetime
import aiohttp
import json


async def getnames(html: str, name: str):
	if '<div>Available*</div>' in html or '<div>Available Later*</div>' in html:
		data = {
			'when': 'never',
			'searches': 69,
			'toa': 'tomorrow',
			'remaining': {
				'days': 0,
				'hours': 0,
				'minutes': 0,
				'seconds': 0
			},
			'remain': 'an eternity'
		}
		lines = html.split('\n')
		for line in lines:
			if 'Available*' in line or 'Available Later*' in line:
				if data['when'] == 'never':
					when = line.split('<div>')[-1].split('</div>')[0].replace('*', '')
					data['when'] = when
			if ' / month' in line:
				if data['searches'] == 69:
					searches = int(line.split(' / month')[0].split('Searches: ')[-1])
					data['searches'] = searches
			if '<meta name="description"' in line:
				if data['toa'] == 'tomorrow':
					toa = line.split('<meta name="description" content="Time of Availability: ')[-1].split(',')[0].split('[')[-1].split(']')[0]
					data['toa'] = toa
			if 'id="countdown-days"' in line:
				data['remaining']['days'] = int(line.split('<span id="countdown-days">')[-1].split('</span')[0])
			if 'id="countdown-hours"' in line:
				data['remaining']['hours'] = int(line.split('<span id="countdown-hours">')[-1].split('</span')[0])
			if 'id="countdown-minutes"' in line:
				data['remaining']['minutes'] = int(line.split('<span id="countdown-minutes">')[-1].split('</span')[0])
			if 'id="countdown-seconds"' in line:
				data['remaining']['seconds'] = int(line.split('<span id="countdown-seconds">')[-1].split('</span')[0])
			remain = data['remaining']
			if remain['days'] != 0 and remain['hours'] != 0 and remain['minutes'] != 0 and remain['seconds'] != 0:
				days = remain['days']
				hours = remain['hours']
				minutes = remain['minutes']
				seconds = remain['seconds']
				data['remain'] = f'{days}d {hours}h {minutes}m {seconds}s'
			elif remain['hours'] != 0 and remain['minutes'] != 0 and remain['seconds'] != 0:
				hours = remain['hours']
				minutes = remain['minutes']
				seconds = remain['seconds']
				data['remain'] = f'{hours}h {minutes}m {seconds}s'
			elif remain['minutes'] != 0 and remain['seconds'] != 0:
				minutes = remain['minutes']
				seconds = remain['seconds']
				data['remain'] = f'{minutes}m {seconds}s'
			elif remain['seconds'] != 0:
				seconds = remain['seconds']
				data['remain'] = f'{seconds}s'
		return data, None, None
	lines = html.split('\n')
	namecount = []
	names = []
	dates = []
	for line in lines:
		if '<div class="col-auto order-md-1          text-nowrap text-right pr-2"><strong>' in line:
			if '</span>' in line:
				namecount.append(line.split('<div class="col-auto order-md-1          text-nowrap text-right pr-2"><strong>')[1].split('</strong>')[0].split('</span>')[-1])
			else:
				namecount.append(line.split('<div class="col-auto order-md-1          text-nowrap text-right pr-2"><strong>')[1].split('</strong>')[0])
		if '<div class="col      order-md-2 col-md-4 text-nowrap">' in line:
			names.append(line.split('<div class="col      order-md-2 col-md-4 text-nowrap">')[1].split('</a></div>')[0].split('">')[-1])
		if '<time datetime=' in line:
			dates.append(line.split('</time>')[0].split('">')[-1])
	return namecount, names, dates

class namemc(commands.Cog, name="NameMC"):
	def __init__(self, bot):
		self.bot = bot

	@commands.command(name='mcnames', description='Retrieve a list of previous Minecraft names for an IGN or UUID')
	async def nmcnames(self, ctx, name: str):
		async with aiohttp.ClientSession() as s:
			async with s.get(f'https://namemc.com/{name}') as r:
				content = await r.text()
		namecount, names, dates = await getnames(content, name)
		if type(namecount) == dict:
			data = namecount 
			embed = discord.Embed(title=f'Name information for {name}', color=ctx.author.color, timestamp=datetime.datetime.utcnow())
			if 'when' in data:
				embed.add_field(name='Availability Status', value=data['when'], inline=False)
			if 'searches' in data:
				embed.add_field(name='Searches', value=data['searches'], inline=False)
			if 'toa' in data and data['toa'] != 'tomorrow':
				date = dateutil.parser.parse(data['toa'])
				date = datetime.datetime.strftime(date, '%d/%m/%Y @ %I:%M:%S %p')
				embed.add_field(name='Time of Availability', value=date, inline=False)
			if 'remain' in data and data['remain'] != 'an eternity':
				embed.add_field(name='Time Remaining', value=data['remain'], inline=False)
			await ctx.send(embed=embed)
		if namecount and names and dates:
			yeet = True
		else:
			raise commands.CommandError('I was unable to parse the list of names for that user')
		namelist = []
		reqname = name
		paginator = WrappedPaginator(prefix='', suffix='', max_size=2000)
		for i, v in enumerate(namecount):
			count = namecount[i]
			namemd = names[i]
			name = discord.utils.escape_markdown(names[i])
			name = f"[{name}](https://namemc.com/name/{name} 'Click here to go to the NameMC page for {namemd}')"
			try:
				date = dateutil.parser.parse(dates[i])
				date = datetime.datetime.strftime(date, '%d/%m/%Y @ %I:%M:%S %p')
			except IndexError:
				date = 'First Name'
			paginator.add_line(f'**{count}** {name}   {date}')
		embed = discord.Embed(title=f'Name history for {reqname}', color=ctx.author.color, timestamp=datetime.datetime.utcnow())
		interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
		await interface.send_to(ctx)
		

def setup(bot):
	bot.add_cog(namemc(bot))
	bot.logger.info(f'$GREENLoaded NameMC cog!')