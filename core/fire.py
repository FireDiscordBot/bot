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

from sentry_sdk.integrations.aiohttp import AioHttpIntegration
from logging.handlers import TimedRotatingFileHandler
from jishaku.modules import resolve_extensions
import core.coloredformat as colorformat
from discord.ext import commands, tasks
from fire.http import HTTPClient, Route
from sentry_sdk import push_scope
from .context import Context
from .config import Config
import functools
import traceback
import sentry_sdk
import aioredis
import aiofiles
import aiohttp
import datetime
import discord
import asyncpg
import asyncio
import logging
import typing
import json
import sys


class Fire(commands.Bot):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.launchtime = datetime.datetime.now(datetime.timezone.utc)
        self.started = False

        # COMMON ATTRIBUTES
        self.config: dict = json.load(open('config.json', 'r'))
        self.configs: typing.Dict[int, Config] = {}
        self.premium_guilds = {}
        self.paginators = {}
        self.db: asyncpg.pool.Pool = None
        self.dev = kwargs.pop('dev', False)
        self.plonked = []

        # CRAB
        self.crab = '🦀'

        # LOGGING
        logging.basicConfig(filename='fire.log', level=logging.INFO)
        self.logger = logging.getLogger('Fire')
        stdout = logging.StreamHandler(sys.stdout)
        stdout.setLevel(logging.INFO)
        COLOR_FORMAT = colorformat.formatter_message(
            "[$BOLD%(name)s$RESET][%(levelname)s] %(message)s $RESET($BOLD%(filename)s$RESET:%(lineno)d)")
        stdout.setFormatter(colorformat.ColoredFormatter(COLOR_FORMAT))
        self.logger.addHandler(stdout)
        gateway = logging.getLogger('discord.gateway')
        gateway.addHandler(stdout)

        # SENTRY
        if 'sentry' in self.config:
            sentry_sdk.init(self.config['sentry'],
                            integrations=[AioHttpIntegration()])

        # REDIS
        self.redis = None
        if 'redis' in self.config:
            self.loop.create_task(self.init_redis())

        # GLOBAL HTTP CLIENTS
        self.http.mojang = HTTPClient(
            'https://api.mojang.com'
        )
        self.http.sk1er = HTTPClient(
            'https://api.sk1er.club',
            user_agent='Fire Discord Bot'
        )
        self.http.modcore = HTTPClient(
            'https://api.modcore.sk1er.club',
            user_agent='Fire Discord Bot'
        )
        self.http.github = HTTPClient(
            'https://api.github.com'
        )
        self.http.youtube = HTTPClient(
            'https://www.googleapis.com/youtube/v3',
            params={'key': self.config['youtube']}
        )

        # HASTEBIN
        self.http.hst = HTTPClient(
            'https://hst.sh',
            user_agent='Fire Discord Bot',
        )
        self.http.hinvwtf = HTTPClient(
            'https://h.inv.wtf',
            user_agent='Fire Discord Bot'
        )

        # MODULES
        self.load_modules()

        # COMMANDS
        self.load_commands()
        self.cmdresp = {}

        # EVENTS
        self.load_events()

        # BLACKLIST
        self.loop.create_task(self.load_plonked())

        self.converted_configs = []
        self.save_configs.start()

    async def logout(self):
        self.save_configs.cancel()
        if self.get_cog('FireStatus') and not self.dev:
            comps = ['gtbpmn9g33jk', 'xp3103fm3kpf']
            for c in comps:
                await asyncio.sleep(1)  # rate limits are fun
                await self.get_cog('FireStatus').set_status(c, 'partial_outage')
        await self.db.close()
        await super().logout()

    async def get_context(self, message: discord.Message, **kwargs):
        silent = False
        if message.content and message.content.endswith(' --silent'):
            message.content = message.content[:-9]
            silent = True
        if 'cls' not in kwargs:
            ctx = await super().get_context(message, cls=Context, **kwargs)
        else:
            ctx = await super().get_context(message, **kwargs)
        if ctx.valid and silent:
            ctx.silent = True
            try:
                await message.delete()
            except Exception:
                pass
        return ctx

    def get_message(self, mid: int):
        if not self.cached_messages:
            return None
        found = [m for m in self.cached_messages if m.id == mid]
        if not found:
            return None
        return found[0]

    def get_config(
        self,
        obj: typing.Union[
            discord.Guild,
            discord.Member,
            discord.User,
            int
        ]
    ) -> Config:
        if hasattr(obj, 'id') and obj.id in self.configs:
            return self.configs[obj.id]
        if isinstance(obj, int) and obj in self.configs:
            return self.configs[obj]
        if isinstance(obj, discord.Guild) or isinstance(obj, int) and self.get_guild(obj):
            conf = self.configs[obj.id if hasattr(obj, 'id') else obj] = Config(
                obj, bot=self, db=self.db)
            self.loop.create_task(conf.load())
            return conf

    async def init_redis(self):
        self.redis = await aioredis.create_redis_pool(
            'redis://localhost',
            db=0 if self.dev else 1,
            password=self.config['redis']
        )

    async def load_plonked(self):
        await self.wait_until_ready()
        query = 'SELECT * FROM blacklist;'
        self.plonked = [p['uid'] for p in await self.db.fetch(query)]
        self.logger.info(f'$GREENLoaded blacklist!')

    @tasks.loop(minutes=5)
    async def save_configs(self):
        await self.wait_until_ready()
        if len(self.converted_configs) == len(self.configs):
            await self.get_user(self.owner_id).send("all configs converted")
        current = self.converted_configs.copy()
        for conf in current:
            await self.get_config(conf).save()
            await asyncio.sleep(1)

    def isadmin(self, user: typing.Union[discord.User, discord.Member]) -> bool:
        if str(user.id) not in self.config['admins']:
            admin = False
        else:
            admin = True
        return admin

    def load_commands(self):
        try:
            self.load_extension('core.chatwatch')
        except Exception as e:
            # errortb = ''.join(traceback.format_exception(
            #     type(e), e, e.__traceback__))
            self.logger.error(
                f'$REDError while loading $CYANChatwatch', exc_info=e)
        try:
            self.load_extension('jishaku')
        except Exception as e:
            # errortb = ''.join(traceback.format_exception(
            #     type(e), e, e.__traceback__))
            self.logger.error(
                f'$REDError while loading $CYANJishaku', exc_info=e)
        for ext in resolve_extensions(self, 'commands.*'):
            try:
                self.load_extension(ext)
            except Exception as e:
                # errortb = ''.join(traceback.format_exception(
                #     type(e), e, e.__traceback__))
                self.logger.error(
                    f'$REDError while loading $CYAN{ext}', exc_info=e)

    def load_events(self):
        for ext in resolve_extensions(self, 'events.*'):
            try:
                self.load_extension(ext)
            except Exception as e:
                # errortb = ''.join(traceback.format_exception(
                #     type(e), e, e.__traceback__))
                self.logger.error(f'$REDError while loading {ext}', exc_info=e)

    def load_modules(self):
        for ext in resolve_extensions(self, 'modules.*'):
            try:
                self.load_extension(ext)
            except Exception as e:
                # errortb = ''.join(traceback.format_exception(
                #     type(e), e, e.__traceback__))
                self.logger.error(f'$REDError while loading {ext}', exc_info=e)

    def sentry_exc(self, error: commands.CommandError, userscope: dict, exclevel: str, extra: dict):
        if 'sentry' not in self.config:
            return
        with push_scope() as scope:
            scope.user = userscope
            scope.level = exclevel
            for key in extra:
                scope.set_tag(key, extra[key])
            sentry_sdk.capture_exception(error)

    async def haste(self, content, fallback: bool = False):
        route = Route(
            'POST',
            '/documents'
        )
        client = self.http.hst
        if fallback:
            client = self.http.hinvwtf
        try:
            h = await client.request(route, data=content)
            return f'{client.BASE_URL}/' + h['key']
        except Exception as e:
            if not fallback:
                return await self.haste(content, fallback=True)
            self.logger.warn(
                f'$REDFailed to create haste on $CYAN{client.BASE_URL}/', exc_info=e)
        return 'Failed to create haste'

    async def is_team_owner(self, user: typing.Union[discord.User, discord.Member]):
        if user.id == self.owner_id:
            return True
        else:
            return False
