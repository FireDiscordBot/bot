import discord
import datetime
import json
import time
import os
import typing
import logging
import aiohttp
import base64
from cryptography import fernet
from aiohttp import web
from aiohttp_session import setup, get_session, session_middleware
from aiohttp_session.cookie_storage import EncryptedCookieStorage
from fire.push import pushbullet

logging.basicConfig(level=logging.INFO)

launchtime = datetime.datetime.utcnow()

client = discord.Client()
routes = web.RouteTableDef()

print('api.py has been loaded')

with open('config.json', 'r') as cfg:
	config = json.load(cfg)

def error_resp(error: str = 'Something went wrong and an error wasn\'t provided.', code: int = 500):
	data = {
		'success': False,
		'error': error,
		'code': code
	}
	headers = {
		'content-type': 'application/json',
		'x-geek-app': str(True),
		'x-geek-bot': client.user.name,
		'x-geek-lastvisit': 'null',
		'success': str(False)
	}
	body = json.dumps(data, indent=2)
	return web.Response(body=body, status=code, headers=headers)

ok_codes = [100, 101, 102, 200, 201, 202]

async def error_middleware(app, handler):
	async def middleware_handler(request):
		try:
			response = await handler(request)
			if response.status == 500:
				return error_resp('the server took a shit on itself.', 500)
			return response
		except web.HTTPException as ex:
			if ex.status not in ok_codes:
				return error_resp(f'{ex.reason}', ex.status)
			raise
	return middleware_handler

app = web.Application(loop=client.loop, middlewares=[error_middleware])
admins = ['287698408855044097', '217562587938816000']
		
@routes.get('/')
async def root(request):
	session = await get_session(request)
	last_visit = session['last_visit'] if 'last_visit' in session else 'null'
	session['last_visit'] = str(datetime.datetime.utcnow()).split('.')[0]
	data = {
		'success': True,
		'bot': str(client.user),
		'now': str(datetime.datetime.utcnow()).split('.')[0],
		'loaded': str(launchtime).split('.')[0],
		'last_visit': last_visit
	}
	headers = {
		'content-type': 'application/json',
		'x-geek-app': str(True),
		'x-geek-bot': client.user.name,
		'x-geek-lastvisit': last_visit
	}
	body = json.dumps(data, indent=2)
	return web.Response(body=body, status=200, headers=headers)

@routes.get('/favicon.ico')
async def favicon(request):
	return web.FileResponse('./favicon.ico')

@routes.get('/error')
async def error_test(request):
	raise discord.HTTPException(message='this is a test')

@routes.get('/user/{id}')
async def user(request):
	session = await get_session(request)
	last_visit = session['last_visit'] if 'last_visit' in session else 'null'
	session['last_visit'] = str(datetime.datetime.utcnow()).split('.')[0]
	try:
		uid = int(request.match_info['id'])
	except ValueError:
		return error_resp('Invalid ID', 400)
	for guild in client.guilds:
		member = guild.get_member(uid)
		if member != None:
			break
	if member == None:
		try:
			if request.rel_url.query['auth'] in admins:
				user = await client.fetch_user(uid)
				data = {
				'name': str(user.name),
				'id': user.id,
				'discrim': int(user.discriminator),
				'created': str(user.created_at).split('.')[0],
				'bot': user.bot,
				'avatar': f'{user.avatar_url}'
				}
				headers = {
				'content-type': 'application/json',
				'x-geek-app': str(True),
				'x-geek-bot': client.user.name,
				'x-geek-lastvisit': last_visit
				}
				body = json.dumps(data, indent=2)
				return web.Response(body=body, status=206, headers=headers)
		except KeyError:
			pass
		if member == None:
			return error_resp('User not found', 404)
	data = {
		'name': str(member.name),
		'id': member.id,
		'discrim': int(member.discriminator),
		'created': str(member.created_at).split('.')[0],
		'bot': member.bot,
		'status': str(member.status),
		'desktop_status': str(member.desktop_status),
		'mobile_status': str(member.mobile_status),
		'web_status': str(member.web_status),
		'avatar': f'{member.avatar_url}'
	}
	try:
		activity = member.activities[0]
	except IndexError:
		activity = None
	if activity != None:
		if activity.name == 'Spotify':
			spotifyinf = {
				'spotify': True,
				'details': {
					'title': activity.title,
					'artists': ', '.join(activity.artists),
					'album': {
						'name': activity.album,
						'cover': activity.album_cover_url
					},
					'track_id': activity.track_id,
					'url': f'https://open.spotify.com/track/{activity.track_id}',
					'duration': str(activity.duration).split('.')[0]
				}
			}
			data.update(spotifyinf)
		elif type(activity) == discord.activity.Streaming:
			activityinf = {
				'activity': {
				'type': 'streaming',
				'name': activity.name,
				'url': activity.url
				}
			}
			data.update(activityinf)
		else:
			activityinf = {
				'activity': {
				'name': activity.name,
				'state': activity.state,
				'details': activity.details,
				'assets': activity.assets,
				'type': activity.type
				}
			}
			data.update(activityinf)
	headers = {
		'content-type': 'application/json',
		'x-geek-app': str(True),
		'x-geek-bot': client.user.name,
		'x-geek-lastvisit': last_visit
	}
	body = json.dumps(data, indent=2)
	return web.Response(body=body, status=200, headers=headers)

@routes.get('/member/{id}/{gid}')
async def member(request):
	session = await get_session(request)
	last_visit = session['last_visit'] if 'last_visit' in session else 'null'
	session['last_visit'] = str(datetime.datetime.utcnow()).split('.')[0]
	try:
		uid = int(request.match_info['id'])
	except ValueError:
		return error_resp('Invalid ID', 400)
	try:
		gid = int(request.match_info['gid'])
	except ValueError:
		gid = None
	if gid == None:
		for guild in client.guilds:
			member = guild.get_member(uid)
			if member != None:
				break
	else:
		for guild in client.guilds:
			if guild.id == gid:
				member = guild.get_member(uid)
				break
	if member == None:
		return error_resp('Member not found', 404)
	data = {
		'name': str(member.name),
		'id': member.id,
		'discrim': int(member.discriminator),
		'created': str(member.created_at).split('.')[0],
		'bot': member.bot,
		'status': str(member.status),
		'desktop_status': str(member.desktop_status),
		'mobile_status': str(member.mobile_status),
		'web_status': str(member.web_status),
		'avatar': f'{member.avatar_url}',
		'guild': {}
	}
	if gid != None:
		data['guild'] = {
			'name': member.guild.name,
			'joined_at': str(member.joined_at).split('.')[0],
			'nickname': str(member.nick),
			'color': str(member.color),
			'top_role': str(member.top_role),
			'icon': str(member.guild.icon_url)
		}
	try:
		activity = member.activities[0]
	except IndexError:
		activity = None
	if activity != None:
		if activity.name == 'Spotify':
			spotifyinf = {
				'spotify': True,
				'details': {
					'title': activity.title,
					'artists': ', '.join(activity.artists),
					'album': {
						'name': activity.album,
						'cover': activity.album_cover_url
					},
					'track_id': activity.track_id,
					'url': f'https://open.spotify.com/track/{activity.track_id}',
					'duration': str(activity.duration).split('.')[0]
				}
			}
			data.update(spotifyinf)
		elif type(activity) == discord.activity.Streaming:
			activityinf = {
				'activity': {
				'type': 'streaming',
				'name': activity.name,
				'url': activity.url
				}
			}
			data.update(activityinf)
		else:
			activityinf = {
				'activity': {
				'name': activity.name,
				'state': activity.state,
				'details': activity.details,
				'assets': activity.assets,
				'type': activity.type
				}
			}
			data.update(activityinf)
	headers = {
		'content-type': 'application/json',
		'x-geek-app': str(True),
		'x-geek-bot': client.user.name,
		'x-geek-lastvisit': last_visit
	}
	body = json.dumps(data, indent=2)
	return web.Response(body=body, status=200, headers=headers)

@routes.get('/guild/{id}')
async def guild(request):
	session = await get_session(request)
	last_visit = session['last_visit'] if 'last_visit' in session else 'null'
	session['last_visit'] = str(datetime.datetime.utcnow()).split('.')[0]
	try:
		gid = int(request.match_info['id'])
	except ValueError:
		return error_resp('Invalid ID', 400)
	guild = client.get_guild(gid)
	if guild == None:
		return error_resp('Guild not found. I may not be in this guild *cough* https://firediscordbot.tk/invite *cough*', 404)
	boostermembers = []
	for member in guild.premium_subscribers:
		boostermembers.append(f'{member}({member.id})')
	data = {
		'name': str(guild.name),
		'id': guild.id,
		'created': str(guild.created_at).split('.')[0],
		'owner': str(guild.owner),
		'owner_id': guild.owner_id,
		'region': str(guild.region),
		'members': guild.member_count,
		'icon': {
			'url': str(guild.icon_url),
			'animated': guild.is_icon_animated()
		},
		'emotes': {

		},
		'channels': {
		},
		'roles': {

		},
		'features': {
			'premium_tier': guild.premium_tier,
			'boosters': {
				'amount': guild.premium_subscription_count,
				'members': boostermembers
			},
			'limits': {
				'emoji': guild.emoji_limit,
				'bitrate': guild.bitrate_limit,
				'filesize': int(str(guild.filesize_limit).split('.')[0])
			}
		}
	}
	emojis = {}
	channels = {
		'category': {

		},
		'text': {

		},
		'voice': {

		},
		'system': {}
	}
	features = {}
	roles = {}
	for emoji in guild.emojis:
		emojis[emoji.name] = emoji.id
	data['emotes'].update(emojis)
	for channel in guild.channels:
		if channel == guild.system_channel:
			channels['system'] = {
				'channel': f'#{channel}',
				'id': channel.id,
				'flags': {
					'join_notifications': guild.system_channel_flags.join_notifications,
					'boost_notifications': guild.system_channel_flags.premium_subscriptions
				}
			}
		if isinstance(channel, discord.CategoryChannel):
			channels['category'][channel.name] = channel.id
		if isinstance(channel, discord.TextChannel):
			channels['text'][channel.name] = channel.id
		if isinstance(channel, discord.VoiceChannel):
			channels['voice'][channel.name] = channel.id
	data['channels'].update(channels)
	for feature in guild.features:
		features[feature] = True
	data['features'].update(features)
	for role in guild.roles:
		roles[role.name] = role.id
	data['roles'].update(roles)
	headers = {
		'content-type': 'application/json',
		'x-geek-app': str(True),
		'x-geek-bot': client.user.name,
		'x-geek-lastvisit': last_visit
	}
	body = json.dumps(data, indent=2)
	return web.Response(body=body, status=200, headers=headers)

@routes.get('/invite/{code}')
async def invite(request):
	session = await get_session(request)
	last_visit = session['last_visit'] if 'last_visit' in session else 'null'
	session['last_visit'] = str(datetime.datetime.utcnow()).split('.')[0]
	invite = None
	try:
		code = request.match_info['code']
	except Exception:
		return error_resp('Invalid Code', 400)
	try:
		invite = await client.fetch_invite(url=code)
	except discord.NotFound or discord.HTTPException as e:
		if isinstance(e, discord.NotFound):
			return error_resp('Invite not found', 404)
		if isinstance(e, discord.HTTPException):
			if e.text != '':
				return error_resp(e.text, e.code)
			else:
				if e.code == None:
					return error_resp('HTTP Error, unknown status code.', 500)
				else:
					return error_resp('HTTP Error', e.code)
	if invite != None:
		route = discord.http.Route("GET", f"/invite/{code}")
		try:
			raw = await client.http.request(route)
		except discord.HTTPException:
			return error_resp('Invite not found', 404)
		invguild = invite.guild
		invchan = invite.channel
		guild = {
			'name': invguild.name,
			'id': invguild.id,
			'verification': str(invguild.verification_level),
			'icon': str(invguild.icon_url),
			'features': raw['guild']['features'],
			'banner': str(invguild.banner_url),
			'splash': str(invguild.splash_url),
			'created': str(invguild.created_at).split('.')[0],
			'moreinfo': None
		}
		if isinstance(invguild, discord.Guild):
			guild['moreinfo'] = f'https://api.gaminggeek.dev/guild/{invguild.id}'
		if isinstance(invchan, discord.PartialInviteChannel):
			invchantype = 'PartialInviteChannel'
		elif isinstance(invchan, discord.TextChannel):
			invchantype = 'TextChannel'
		elif isinstance(invchan, discord.VoiceChannel):
			invchantype = 'VoiceChannel'
		else:
			invchantype = None
		channel = {
			'name': invchan.name,
			'id': invchan.id,
			'type': invchantype,
			'created': str(invchan.created_at).split('.')[0]
		}
		data = {
			'code': invite.code,
			'guild': {

			},
			'channel': {

			},
			'inviter': str(invite.inviter),
			'approx_members': invite.approximate_member_count,
			'approx_active_members': invite.approximate_presence_count,
			'url': invite.url
		}
		data['guild'].update(guild)
		data['channel'].update(channel)
		headers = {
		'content-type': 'application/json',
		'x-geek-app': str(True),
		'x-geek-bot': client.user.name,
		'x-geek-lastvisit': last_visit
		}
		body = json.dumps(data, indent=2)
		return web.Response(body=body, status=200, headers=headers)
	else:
		return error_resp('Something went wrong internally /shrug', 500)

async def start_api():
	fernet_key = fernet.Fernet.generate_key()
	secret_key = base64.urlsafe_b64decode(fernet_key)
	setup(app, EncryptedCookieStorage(secret_key))
	app.add_routes(routes)
	runner = web.AppRunner(app)
	await runner.setup()
	site = web.TCPSite(runner, 'localhost', 1337)
	await site.start()

@client.event
async def on_ready():
	print('hi')
	try:
		await start_api()
		print('Started API on port 1337 (localhost) and https://api.gaminggeek.dev/')
	except Exception as e:
		print(e)

client.run(config['token'])