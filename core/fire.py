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

from logging.handlers import TimedRotatingFileHandler
from jishaku.modules import resolve_extensions
import core.coloredformat as colorformat
from discord.ext import commands, tasks
from aioinflux import InfluxDBClient
from sentry_sdk import push_scope
from .context import Context
from .config import Config
import functools
import traceback
import sentry_sdk
import aiofiles
import aiohttp
import datetime
import discord
import asyncpg
import logging
import typing
import json
import sys


class Fire(commands.Bot):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.launchtime = datetime.datetime.utcnow()

        # COMMON ATTRIBUTES
        self.config: dict = json.load(open('config.json', 'r'))
        self.configs = {}
        self.overrides: dict = json.load(open('overrides.json', 'r'))
        self.override_save.start()
        self.tips = json.load(open('tips.json', 'r'))
        self.premiumGuilds = []
        self.db: asyncpg.pool.Pool = None
        self.realtime_members = True
        self.dev = kwargs.pop('dev', False)

        # CRAB
        self.crab = '🦀'

        # LOGGING
        logging.basicConfig(filename='bot.log', level=logging.INFO)
        self.logger = logging.getLogger('Fire')
        stdout = logging.StreamHandler(sys.stdout)
        stdout.setLevel(logging.INFO)
        COLOR_FORMAT = colorformat.formatter_message("[$BOLD%(name)s$RESET][%(levelname)s] %(message)s $RESET($BOLD%(filename)s$RESET:%(lineno)d)")
        stdout.setFormatter(colorformat.ColoredFormatter(COLOR_FORMAT))
        self.logger.addHandler(stdout)

        # SENTRY
        if 'sentry' in self.config:
            sentry_sdk.init(self.config['sentry'])

        # INFLUX
        if 'influx_user' in self.config and 'influx_pass' in self.config:
            self.influx = InfluxDBClient(
                db='firedev' if self.dev else 'fire',
                username=self.config['influx_user'],
                password=self.config['influx_pass']
            )

        # MODULES
        self.load_modules()

        # COMMANDS
        self.load_commands()
        self.cmdresp = {}

        # EVENTS
        self.load_events()

        # CUSTOM PERMISSIONS
        # self.permissions = {}

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

    def isadmin(self, user: typing.Union[discord.User, discord.Member]) -> bool:
        if str(user.id) not in self.config['admins']:
            admin = False
        else:
            admin = True
        return admin

    def load_commands(self):
        try:
            # raise Exception('Chatwatch is temporarily disabled')
            self.load_extension('core.chatwatch')
        except Exception as e:
            # errortb = ''.join(traceback.format_exception(
            #     type(e), e, e.__traceback__))
            self.logger.error(f'$REDError while loading $CYANChatwatch', exc_info=e)
        try:
            self.load_extension('jishaku')
        except Exception as e:
            # errortb = ''.join(traceback.format_exception(
            #     type(e), e, e.__traceback__))
            self.logger.error(f'$REDError while loading $CYANJishaku', exc_info=e)
        for ext in resolve_extensions(self, 'commands.*'):
            try:
                self.load_extension(ext)
            except Exception as e:
                # errortb = ''.join(traceback.format_exception(
                #     type(e), e, e.__traceback__))
                self.logger.error(f'$REDError while loading $CYAN{ext}', exc_info=e)

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
        with push_scope() as scope:
            scope.user = userscope
            scope.level = exclevel
            for key in extra:
                scope.set_tag(key, extra[key])
            sentry_sdk.capture_exception(error)

    @tasks.loop(minutes=2)
    async def override_save(self):
        await self.wait_until_ready()
        try:
            f = await aiofiles.open('overrides.json', 'w')
            await f.write(json.dumps(self.overrides))
            await f.close()
        except Exception:
            pass

    async def haste(self, content, fallback: bool=False):
        url = 'hst.sh'
        if fallback:
            url = 'h.inv.wtf'
        async with aiohttp.ClientSession().post(f'https://{url}/documents', data=content) as r:
            if r.status != 200 and not fallback:
                return await self.haste(content, fallback=True)
            j = await r.json()
            return f'https://{url}/' + j['key']

    async def is_team_owner(self, user: typing.Union[discord.User, discord.Member]):
        if user.id == self.owner_id:
            return True
        else:
            return False
