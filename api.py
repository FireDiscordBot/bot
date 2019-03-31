import discord
import datetime
import json
import time
import os
import dataset
import typing
from aiohttp import web

launchtime = datetime.datetime.utcnow()
db = dataset.connect('sqlite:///fire.db')

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
		
@routes.get('/')
async def root(request):
	data = {
		'success': True,
		'bot': str(client.user),
		'now': str(datetime.datetime.utcnow()),
		'loaded': str(launchtime)
	}
	headers = {
		'content-type': 'application/json',
		'x-geek-app': str(True),
		'x-geek-bot': client.user.name
	}
	body = json.dumps(data, indent=2)
	return web.Response(body=body, status=200, headers=headers)

@routes.get('/user/{id}')
async def user(request):
	try:
		uid = int(request.match_info['id'])
	except ValueError:
		return error_resp('Invalid ID', 400)
	for guild in client.guilds:
		member = guild.get_member(uid)
		if member != None:
			break
	if member == None:
		return error_resp('User not found', 404)
	data = {
		'name': str(member.name),
		'id': member.id,
		'discrim': int(member.discriminator),
		'created': str(member.created_at),
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
		'x-geek-bot': client.user.name
	}
	body = json.dumps(data, indent=2)
	return web.Response(body=body, status=200, headers=headers)

@routes.get('/member/{id}/{gid}')
async def member(request):
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
		'created': str(member.created_at),
		'bot': member.bot,
		'status': str(member.status),
		'desktop_status': str(member.desktop_status),
		'mobile_status': str(member.mobile_status),
		'web_status': str(member.web_status),
		'avatar': f'{member.avatar_url}'
	}
	if gid != None:
		ginfo = {
			'guild': member.guild.name,
			'joined_at': str(member.joined_at),
			'nickname': str(member.nick),
			'color': str(member.color),
			'top_role': str(member.top_role)
		}
		data.update(ginfo)
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
		'x-geek-bot': client.user.name
	}
	body = json.dumps(data, indent=2)
	return web.Response(body=body, status=200, headers=headers)

@routes.get('/guild/{id}')
async def guild(request):
	try:
		gid = int(request.match_info['id'])
	except ValueError:
		return error_resp('Invalid ID', 400)
	guild = client.get_guild(gid)
	if guild == None:
		return error_resp('Guild not found', 404)
	data = {
		'name': str(guild.name),
		'id': guild.id,
		'owner': str(guild.owner),
		'owner_id': guild.owner_id,
		'region': str(guild.region),
		'members': guild.member_count,
		'emotes': {

		},
		'channels': {
			
		},
		'roles': {

		},
		'features': {

		}
	}
	emojis = {}
	channels = {
		'category': {

		},
		'text': {

		},
		'voice': {

		}
	}
	features = {}
	roles = {}
	for emoji in guild.emojis:
		emojis[emoji.name] = emoji.id
	data['emotes'].update(emojis)
	for channel in guild.channels:
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
		'x-geek-bot': client.user.name
	}
	body = json.dumps(data, indent=2)
	return web.Response(body=body, status=200, headers=headers)

@routes.get('/invite/{code}')
async def invite(request):
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
		invguild = invite.guild
		invchan = invite.channel
		guild = {
			'name': invguild.name,
			'id': invguild.id,
			'verification': str(invguild.verification_level),
			'icon': invguild.icon_url,
			'banner': invguild.banner_url,
			'splash': invguild.splash_url,
			'created': str(invguild.created_at)
		}
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
			'created': str(invchan.created_at)
		}
		data = {
			'code': invite.code,
			'guild': {

			},
			'channel': {

			},
			'created_at': str(invite.created_at),
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
		'x-geek-bot': client.user.name
		}
		body = json.dumps(data, indent=2)
		return web.Response(body=body, status=200, headers=headers)
	else:
		return error_resp('Something went wrong internally /shrug', 500)

async def start_api():
	app.add_routes(routes)
	runner = web.AppRunner(app)
	await runner.setup()
	site = web.TCPSite(runner, 'localhost', 1337)
	await site.start()

@client.event
async def on_ready():
	print('hi')
	await start_api()

client.run('NDQ0ODcxNjc3MTc2NzA5MTQx.D2RVpQ.Xvzxmjk14CpVM03wR55dvFUAmN4')