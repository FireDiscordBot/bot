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
from datadog import initialize, statsd, ThreadStats
from jishaku.modules import resolve_extensions
import core.coloredformat as colorformat
from sentry_sdk import push_scope
from discord.ext import commands
from .context import Context
from .config import Config
import traceback
import sentry_sdk
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
        self.premiumGuilds = []
        self.db: asyncpg.pool.Pool = None
        self.dev = False

       # CRAB
        self.crab = '🦀'

        # LOGGING
        logging.basicConfig(filename='bot.log', level=logging.INFO)
        self.logger = logging.getLogger('Fire')
        stdout = logging.StreamHandler(sys.stdout)
        stdout.setLevel(logging.INFO)
        COLOR_FORMAT = colorformat.formatter_message("[$BOLD%(name)s$RESET][%(levelname)s] %(message)s $RESET($BOLD%(filename)s$RESET:%(lineno)d)", True)
        stdout.setFormatter(colorformat.ColoredFormatter(COLOR_FORMAT))
        self.logger.addHandler(stdout)

        # SENTRY AND DATADOG
        self.datadog: ThreadStats = None
        if 'sentry' in self.config:
            sentry_sdk.init(self.config['sentry'])
        if 'datadogapi' in self.config and 'datadogapp' in self.config:
            datadogopt = {
                'api_key': self.config['datadogapi'],
                'app_key': self.config['datadogapp']
            }
            initialize(**datadogopt)
            self.datadog = ThreadStats()
            self.datadog.start()

        # COMMANDS
        self.loadCommands()

        # EVENTS
        self.loadEvents()

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
            await message.delete()
        return ctx

    def isadmin(self, user: typing.Union[discord.User, discord.Member]) -> bool:
        if str(user.id) not in self.config['admins']:
            admin = False
        else:
            admin = True
        return admin

    def loadCommands(self):
        try:
            # raise Exception('Chatwatch is temporarily disabled')
            self.load_extension('core.chatwatch')
        except Exception as e:
            # errortb = ''.join(traceback.format_exception(
            #     type(e), e, e.__traceback__))
            self.logger.error(f'$REDError while loading $BLUEChatwatch', exc_info=e)
        try:
            self.load_extension('jishaku')
        except Exception as e:
            # errortb = ''.join(traceback.format_exception(
            #     type(e), e, e.__traceback__))
            self.logger.error(f'$REDError while loading $BLUEJishaku', exc_info=e)
        for ext in resolve_extensions(self, 'commands.*'):
            try:
                self.load_extension(ext)
            except Exception as e:
                # errortb = ''.join(traceback.format_exception(
                #     type(e), e, e.__traceback__))
                self.logger.error(f'Error while loading $BLUE{ext}', exc_info=e)
        for ext in resolve_extensions(self, 'modules.*'):
            try:
                self.load_extension(ext)
            except Exception as e:
                # errortb = ''.join(traceback.format_exception(
                #     type(e), e, e.__traceback__))
                self.logger.error(f'Error while loading $BLUE{ext}', exc_info=e)

    def loadEvents(self):
        for ext in resolve_extensions(self, 'events.*'):
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

    async def is_team_owner(self, user: typing.Union[discord.User, discord.Member]):
        if user.id == self.owner_id:
            return True
        else:
            return False
