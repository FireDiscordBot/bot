"""
MIT License
Copyright (c) 2019 GamingGeek

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
import traceback
import sentry_sdk
import discord
import asyncpg
import logging
import typing
import json
import sys

# fuck it, crab in the code
# 🦀


class Fire(commands.Bot):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # COMMON ATTRIBUTES
        self.config: dict = json.load(open('config.json', 'r'))
        self.db: asyncpg.pool.Pool = None
        self.dev = False

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

    def get_context(self, message: discord.Message, **kwargs):
        if 'cls' not in kwargs:
            return super().get_context(message, cls=Context, **kwargs)
        return super().get_context(message, **kwargs)

    def isadmin(self, user: typing.Union[discord.User, discord.Member]) -> bool:
        if str(user.id) not in self.config['admins']:
            admin = False
        else:
            admin = True
        return admin

    def loadCommands(self):
        try:
            raise Exception('Chatwatch is temporarily disabled')
            # self.load_extension('core.chatwatch')
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

    # Unfinished permission system that may or may not get finished at all

    # async def loadPermissions(self):
    #     self.permissions = {}
    #     query = 'SELECT * FROM permissions;'
    #     perms = await self.db.fetch(query)
    #     for p in perms:
    #         permcat = p['category']
    #         if permcat == 'guild':
    #             guild = p['catid']
    #             if guild not in self.permissions:
    #                 self.permissions[guild] = {}
    #             permtype = p['type']
    #             if permtype == 'member':
    #                 member = p['uuid']
    #                 if 'members' not in self.permissions[guild]:
    #                     self.permissions[guild]['members'] = {}
    #                 if member not in self.permissions[guild]['members']:
    #                     self.permissions[guild]['members'][member] = []
    #                 node = p['node']
    #                 self.permissions[guild]['members'][member].append(node)
    #             if permtype == 'role':
    #                 role = p['uuid']
    #                 if 'roles' not in self.permissions[guild]:
    #                     self.permissions[guild]['roles'] = {}
    #                 if role not in self.permissions[guild]['roles']:
    #                     self.permissions[guild]['roles'][role] = []
    #                 node = p['node']
    #                 self.permissions[guild]['roles'][role].append(node)
    #             if permtype == 'denied':
    #                 if 'global' not in self.permissions[guild]:
    #                     self.permissions[guild]['global'] = {}
    #                 if 'denied' not in self.permissions[guild]['global']:
    #                     self.permissions[guild]['global']['denied'] = []
    #                 node = p['node']
    #                 self.permissions[guild]['global']['denied'].append(node)
    #             if permtype == 'allowed':
    #                 if 'global' not in self.permissions[guild]:
    #                     self.permissions[guild]['global'] = {}
    #                 if 'allowed' not in self.permissions[guild]['global']:
    #                     self.permissions[guild]['global']['allowed'] = []
    #                 node = p['node']
    #                 self.permissions[guild]['global']['allowed'].append(node)
    #         elif permcat == 'global':
    #             if 'global' not in self.permissions:
    #                 self.permissions['global'] = {}
    #             catid = p['catid']
    #             if catid == 0:
    #                 if 'default' not in self.permissions['global']:
    #                     self.permissions['global']['default'] = []
    #                 node = p['node']
    #                 self.permissions['global']['default'].append(node)
    #             else:
    #                 if catid not in self.permissions['global']:
    #                     self.permissions['global'][catid] = []
    #                 node = p['node']
    #                 self.permissions['global'][catid].append(node)
