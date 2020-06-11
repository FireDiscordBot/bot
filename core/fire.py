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
from fire.http import HTTPClient, Route
from sentry_sdk import push_scope
from .context import Context
from .config import GuildConfig, UserConfig
import functools
import traceback
import sentry_sdk
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
        self.configs: typing.Dict[int, typing.Union[GuildConfig, UserConfig]] = {}
        self.tips = json.load(open('tips.json', 'r'))
        self.premium_guilds = {}
        self.db: asyncpg.pool.Pool = None
        self.dev = kwargs.pop('dev', False)

        # CRAB
        self.crab = '🦀'
        # test test I am typing things wow look at me go
        # can we get a crab in chat bois
        # this is epic
        # hopefully this looks good when I check the vod
        # forgot what it was called haha
        # i should commit these comments
        # fuck it let's do it

        # LOGGING
        logging.basicConfig(filename='fire.log', level=logging.INFO)
        self.logger = logging.getLogger('Fire')
        stdout = logging.StreamHandler(sys.stdout)
        stdout.setLevel(logging.INFO)
        COLOR_FORMAT = colorformat.formatter_message("[$BOLD%(name)s$RESET][%(levelname)s] %(message)s $RESET($BOLD%(filename)s$RESET:%(lineno)d)")
        stdout.setFormatter(colorformat.ColoredFormatter(COLOR_FORMAT))
        self.logger.addHandler(stdout)

        # SENTRY
        if 'sentry' in self.config:
            sentry_sdk.init(self.config['sentry'])

        # GLOBAL HTTP CLIENTS
        self.http.mojang = HTTPClient(
            'https://api.mojang.com'
        )
        self.http.hypixel = HTTPClient(
            'https://api.hypixel.net',
            params={'key': self.config["hypixel"]}
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

        # CUSTOM PERMISSIONS
        # self.permissions = {}

    async def logout(self):
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
    ) -> typing.Union[GuildConfig, UserConfig]:
        if hasattr(obj, 'id') and obj.id in self.configs:
            return self.configs[obj.id]
        if isinstance(obj, int) and obj in self.configs:
            return self.configs[obj]
        if isinstance(obj, discord.Guild) or isinstance(obj, int) and self.get_guild(obj):
            conf = self.configs[obj.id if hasattr(obj, 'id') else obj] = GuildConfig(obj, bot=self, db=self.db)
            self.loop.create_task(conf.load())
            return conf
        if isinstance(obj, (discord.User, discord.Member)) or isinstance(obj, int) and self.get_user(obj):
            if (obj.bot if hasattr(obj, 'bot') else self.get_user(obj).bot):
                return False
            conf = self.configs[obj.id if hasattr(obj, 'id') else obj] = UserConfig(obj, bot=self, db=self.db)
            return conf  # Attempting to set an option in UserConfig will load/init the config if not already

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
            self.logger.warn(f'$REDFailed to create haste on $CYAN{client.BASE_URL}/', exc_info=e)
        return 'Failed to create haste'

    async def is_team_owner(self, user: typing.Union[discord.User, discord.Member]):
        if user.id == self.owner_id:
            return True
        else:
            return False
