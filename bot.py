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

from discord.ext import commands
from discord.ext.commands import has_permissions, MissingPermissions
from discord import Webhook, AsyncWebhookAdapter
import discord
import logging
import datetime
import os
import re
import json
import aiohttp
import asyncio
import random
import typing
import asyncpg
import traceback
import functools
import humanfriendly
from fire.push import pushbullet
from fire.invite import replaceinvite
from fire import exceptions
import sentry_sdk
from sentry_sdk import push_scope
from sentry_sdk.integrations.aiohttp import AioHttpIntegration
from datadog import initialize, statsd, ThreadStats

with open('config.json', 'r') as cfg:
	config = json.load(cfg)

logging.basicConfig(filename='bot.log',level=logging.INFO)
sentry_sdk.init(config['sentry'], integrations=[AioHttpIntegration()])
datadogopt = {
    'api_key':config['datadogapi'],
    'app_key':config['datadogapp']
}

initialize(**datadogopt)

def isadmin(ctx):
	if str(ctx.author.id) not in config['admins']:
		admin = False
	else:
		admin = True
	return admin

# async def get_pre(bot, message):
# 	if not message.guild:
# 		return "$"
# 	query = 'SELECT * FROM prefixes WHERE gid = $1;'
# 	prefixraw = await bot.db.fetch(query, message.guild.id)
# 	if prefixraw:
# 		prefix = prefixraw[0]['prefix']
# 	else:
# 		prefix = "$"
# 	return commands.when_mentioned_or(prefix, 'fire ')(bot, message)

async def get_pre(bot, message):
	if isinstance(message.channel, discord.DMChannel):
		return commands.when_mentioned_or('$', 'fire ')(bot, message)
	if not hasattr(bot, 'prefixes'):
		return commands.when_mentioned_or('$', 'fire ')(bot, message)
	prefix = bot.prefixes[message.guild.id] if message.guild.id in bot.prefixes else "$"
	return commands.when_mentioned_or(prefix, 'fire ')(bot, message)

bot = commands.Bot(command_prefix=get_pre, status=discord.Status.idle, activity=discord.Game(name="inv.wtf/fire"), case_insensitive=True)
bot.dev = False

bot.datadog = ThreadStats()
bot.datadog.start()

async def is_team_owner(user: typing.Union[discord.User, discord.Member]):
	owner_id = 287698408855044097 # i hate dev license for requiring the app to be on a team. it broke everything
	if user.id == owner_id:
		return True
	else:
		return False

bot.is_team_owner = is_team_owner

changinggame = False

extensions = [
	"cogs.misc",
	"cogs.fire",
	"cogs.music",
	"cogs.pickle",
	"cogs.ksoft",
	"cogs.skier",
	"cogs.utils",
	"cogs.help",
	"cogs.dbl",
	"cogs.youtube",
	"cogs.settings",
	"cogs.moderation",
	"cogs.premium",
	"cogs.assist",
	"cogs.imagegen",
	"cogs.koding",
	"cogs.conorthedev",
	"jishaku",
	"fishin.abucket"
]

for cog in extensions:
	try:
		bot.load_extension(cog)
	except Exception as e:
		errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
		print(f"Error while loading {cog}")
		print(errortb)

def sentry_exc(error, userscope, exclevel, extra):
	with push_scope() as scope:
		scope.user = userscope
		scope.level = exclevel
		for key in extra:
			scope.set_tag(key, extra[key])
		sentry_sdk.capture_exception(error)

@bot.event
async def on_command_error(ctx, error):

	# This prevents any commands with local handlers being handled here in on_command_error.
	if hasattr(ctx.command, 'on_error'):
		return

	if isinstance(error, commands.CommandNotFound):
		return

	ignored = (commands.CheckFailure, KeyError)
	sentryignored = (commands.CheckFailure)
	noperms = (commands.BotMissingPermissions, commands.MissingPermissions, discord.Forbidden)
	saved = error

	if not isinstance(error, noperms):
		# print(f'Error User ID: {ctx.author.id}')
		# print(f'Error Username: {ctx.author}')
		# print(f'Error Guild: {ctx.guild.__repr__()}')
		# print(f'Error User: {ctx.author.__repr__()}')
		# print(f'Error User Avatar: {ctx.author.avatar_url}')
		userscope = {
			"id": str(ctx.author.id),
			"username": str(ctx.author)
		}
		extra = {
			"guild.name": ctx.guild.name if ctx.guild else 'N/A',
			"guild.id": ctx.guild.id if ctx.guild else 'N/A',
			"server_name": "Fire"
		}
		if isinstance(error, sentryignored):
			exclevel = 'warning'
		elif isinstance(error, commands.CommandOnCooldown):
			exclevel = 'info'
		else:
			exclevel = 'error'
		await bot.loop.run_in_executor(None, func=functools.partial(sentry_exc, error, userscope, exclevel, extra))
	# Allows us to check for original exceptions raised and sent to CommandInvokeError.
	# If nothing is found. We keep the exception passed to on_command_error.
	error = getattr(error, 'original', error)

	# Anything in ignored will return and prevent anything happening.
	if isinstance(error, ignored):
		if 'permission' in str(error):
			pass
		else:
			return


	if isinstance(error, commands.CommandOnCooldown):
		td = datetime.timedelta(seconds=error.retry_after)
		return await ctx.send(f'<a:fireFailed:603214400748257302> This command is on cooldown, please wait {humanfriendly.format_timespan(td)}', delete_after=5)

	errorstr = replaceinvite(str(error))
	if 'http://' in str(error) or 'https://' in str(error):
		errorstr = re.sub(r'(?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)', 'BLOCKED URL', str(error), 0, re.MULTILINE)

	if isinstance(error, noperms):
		return await ctx.send(f'<a:fireFailed:603214400748257302> {discord.utils.escape_mentions(discord.utils.escape_markdown(errorstr))}')

	await ctx.send(f'<a:fireFailed:603214400748257302> {discord.utils.escape_mentions(discord.utils.escape_markdown(errorstr))}')
	nomsg = (commands.BotMissingPermissions, commands.MissingPermissions, commands.UserInputError, commands.MissingRequiredArgument, commands.TooManyArguments)
	if isinstance(error, nomsg):
		return
	errortb = ''.join(traceback.format_exception(type(error), error, error.__traceback__))
	embed = discord.Embed(colour=ctx.author.color, url="https://http.cat/500", description=f"hi. someone did something and this happened. pls fix now!\n```py\n{errortb}```", timestamp=datetime.datetime.utcnow())
	embed.add_field(name='User', value=ctx.author, inline=False)
	embed.add_field(name='Guild', value=ctx.guild, inline=False)
	embed.add_field(name='Message', value=ctx.message.system_content, inline=False)
	embednotb = discord.Embed(colour=ctx.author.color, url="https://http.cat/500", description=f"hi. someone did something and this happened. pls fix now!", timestamp=datetime.datetime.utcnow())
	embednotb.add_field(name='User', value=ctx.author, inline=False)
	embednotb.add_field(name='Guild', value=ctx.guild, inline=False)
	embednotb.add_field(name='Message', value=ctx.message.system_content, inline=False)
	me = bot.get_user(287698408855044097)
	try:
		await me.send(embed=embed)
	except discord.HTTPException:
		await me.send(embed=embednotb)
		await me.send(f'```py\n{errortb}```')
	time = datetime.datetime.utcnow().strftime('%d/%b/%Y:%H:%M:%S')
	guild = ctx.guild or 'None'
	gid = ctx.guild.id if guild != 'None' else 0
	message = f'```ini\n[Command Error Logger]\n\n[User] {ctx.author}({ctx.author.id})\n[Guild] {guild}({gid})\n[Message] {ctx.message.system_content}\n[Time] {time}\n\n[Traceback]\n{errortb}```'
	messagenotb = f'```ini\n[Command Error Logger]\n\n[User] {ctx.author}({ctx.author.id})\n[Guild] {guild}({gid}))\n[Message] {ctx.message.system_content}\n[Time] {time}```'
	tbmessage = f'```ini\n[Traceback]\n{errortb}```'
	async with aiohttp.ClientSession() as session:
		webhook = Webhook.from_url(config['logwebhook'], adapter=AsyncWebhookAdapter(session))
		try:
			await webhook.send(message, username='Command Error Logger')
		except discord.HTTPException:
			await webhook.send(messagenotb, username='Command Error Logger')
			await webhook.send(tbmessage, username='Command Error Logger')

@bot.event
async def on_ready():
	misc = bot.get_cog("Miscellaneous")
	await misc.loadutils()
	try:
		bot.load_extension("cogs.sk1erdiscord")
	except Exception:
		pass
	print("-------------------------")
	print(f"Bot: {bot.user}")
	print(f"ID: {bot.user.id}")
	print(f"Guilds: {len(bot.guilds)}")
	print(f"Users: {len(bot.users)}")
	print("-------------------------")
	logging.info("-------------------------")
	logging.info(f"Bot: {bot.user}")
	logging.info(f"ID: {bot.user.id}")
	logging.info(f"Guilds: {len(bot.guilds)}")
	logging.info(f"Users: {len(bot.users)}")
	logging.info("-------------------------")
	print("Loaded!")
	logging.info(f"LOGGING START ON {datetime.datetime.utcnow()}")

@bot.event
async def on_message(message):
	if isinstance(message.channel, discord.DMChannel):
		return await bot.process_commands(message)
	if message.author.bot:
		await bot.loop.run_in_executor(None, func=functools.partial(bot.datadog.increment, 'messages.bot'))
		return
	else:
		await bot.loop.run_in_executor(None, func=functools.partial(bot.datadog.increment, 'messages.user'))
	if message.system_content == "":
		return
	await bot.process_commands(message)

@bot.event
async def on_message_edit(before,after):
	if after.author.bot:
		await bot.loop.run_in_executor(None, func=functools.partial(bot.datadog.increment, 'messageedit.bot'))
		return
	else:
		await bot.loop.run_in_executor(None, func=functools.partial(bot.datadog.increment, 'messageedit.user'))
	if before.content == after.content:
		return
	await bot.process_commands(after)

@bot.event
async def on_guild_join(guild):
	await bot.loop.run_in_executor(None, func=functools.partial(bot.datadog.increment, 'guilds.join'))
	con = await bot.db.acquire()
	async with con.transaction():
		query = 'INSERT INTO settings (\"gid\") VALUES ($1);'
		try:
			await bot.db.execute(query, guild.id)
		except asyncpg.exceptions.UniqueViolationError:
			pass
	await bot.db.release(con)
	# await bot.db.execute(f'INSERT INTO settings (\"gid\") VALUES ({guild.id});')
	# await bot.conn.commit()
	print(f"Fire joined a new guild! {guild.name}({guild.id}) with {guild.member_count} members")
	try:
		await pushbullet("note", "Fire joined a new guild!", f"Fire joined {guild.name}({guild.id}) with {guild.member_count} members", f"https://api.gaminggeek.dev/guild/{guild.id}")
	except exceptions.PushError as e:
		print(e)

@bot.event
async def on_guild_remove(guild):
	await bot.loop.run_in_executor(None, func=functools.partial(bot.datadog.increment, 'guilds.leave'))
	print(f"Fire left the guild {guild.name}({guild.id}) with {guild.member_count} members! Goodbye o/")
	try:
		await pushbullet("link", "Fire left a guild!", f"Fire left {guild.name}({guild.id}) with {guild.member_count} members! Goodbye o/", f"https://api.gaminggeek.dev/guild/{guild.id}")
	except exceptions.PushError as e:
		print(e)
	# await bot.db.execute(f'DELETE FROM prefixes WHERE gid = {guild.id};')
	# await bot.db.execute(f'DELETE FROM settings WHERE gid = {guild.id};')
	# await bot.db.execute(f'DELETE FROM premium WHERE gid = {guild.id};')
	# await bot.conn.commit()

@bot.command(description="Change the prefix for this guild. (For prefixes with a space, surround it in \"\")")
@has_permissions(administrator=True)
@commands.guild_only()
async def prefix(ctx, pfx: str = None):
	"""PFXprefix <prefix>"""
	if pfx == None:
		return await ctx.send("Missing argument for prefix! (Note: For prefixes with a space, surround it in \"\")")
	if ctx.me.mention in pfx:
		return await ctx.send(f'{ctx.me.mention} is a global prefix, you can use it anywhere. There\'s no need to set the server prefix to it')
	if len(pfx) > 10:
		return await ctx.send(f'Short prefixes are usually better. Try setting a prefix that\'s less than 10 characters')
	else:
		query = 'SELECT * FROM prefixes WHERE gid = $1;'
		prefixraw = await bot.db.fetch(query, ctx.guild.id)
		con = await bot.db.acquire()
		if not prefixraw: #INSERT INTO prefixes (\"name\", \"gid\", \"prefix\") VALUES (\"{ctx.guild.name}\", {ctx.guild.id}, \"{pfx}\");
			async with con.transaction():
				query = 'INSERT INTO prefixes (\"name\", \"gid\", \"prefix\") VALUES ($1, $2, $3);'
				await bot.db.execute(query, ctx.guild.name, ctx.guild.id, pfx)
			await bot.db.release(con)
		else: #UPDATE prefixes SET prefix = \"{pfx}\" WHERE gid = {ctx.guild.id};
			async with con.transaction():
				query = 'UPDATE prefixes SET prefix = $1 WHERE gid = $2;'
				await bot.db.execute(query, pfx, ctx.guild.id)
			await bot.db.release(con)
		# if prefixraw == None:
		# 	await bot.db.execute(f'INSERT INTO prefixes (\"name\", \"gid\", \"prefix\") VALUES (\"{ctx.guild.name}\", {ctx.guild.id}, \"{pfx}\");')
		# else:
		# 	await bot.db.execute(f'UPDATE prefixes SET prefix = \"{pfx}\" WHERE gid = {ctx.guild.id};')
		# await bot.conn.commit()
		misc = bot.get_cog("Miscellaneous")
		await misc.loadutils()
		await ctx.send(f'Ok, {discord.utils.escape_mentions(ctx.guild.name)}\'s prefix is now {pfx}!')

@bot.command(hidden=True)
async def shutdown(ctx):
	if isadmin(ctx):
		for VoiceClient in bot.voice_clients:
			await VoiceClient.disconnect()
		await ctx.send("bye bitch")
		await bot.logout()
		quit()
	else:
		await ctx.send("no.")

@bot.check
async def blacklist_check(ctx):
	if ctx.author.id == 287698408855044097:
		return True
	elif ctx.author.id in ctx.bot.plonked:
		return False
	else:
		return True

@bot.check
async def cmdperm_check(ctx):
	if isinstance(ctx.channel, discord.DMChannel):
		return True
	settings = ctx.bot.get_cog('Settings')
	if not settings:
		return True
	if ctx.command.name in settings.disabledcmds.get(ctx.guild.id, []):
		if not ctx.author.permissions_in(ctx.channel).manage_messages:
			return False
		else:
			return True
	if ctx.guild.id in settings.modonly and ctx.channel.id in settings.modonly[ctx.guild.id]:
		if not ctx.author.permissions_in(ctx.channel).manage_messages:
			return False
		else:
			return True
	if ctx.guild.id in settings.adminonly and ctx.channel.id in settings.adminonly[ctx.guild.id]:
		if not ctx.author.permissions_in(ctx.channel).manage_guild:
			return False
		else:
			return True
	return True

async def start_bot():
	try:
		login_data = {"user": "postgres", "password": config['pgpassword'], "database": "fire", "host": "127.0.0.1"}
		bot.db = await asyncpg.create_pool(**login_data)
		await bot.start(config['token'])
	except KeyboardInterrupt:
		await bot.db.close()
		await bot.logout()

if __name__ == "__main__":
	asyncio.get_event_loop().run_until_complete(start_bot())
