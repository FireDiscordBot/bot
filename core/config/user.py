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


from .constants import ConfigOpt
from .errors import *
import discord
import inspect
import json


options = dict()


class Config:
    __slots__ = ('options', 'loaded', '_bot', '_user', '_db', '_data')

    def __init__(self, user, **kwargs):
        self.options = options
        self.loaded: bool = False
        self._bot = kwargs.pop('bot')
        self._user = self._bot.get_user(user) or user
        self._db = kwargs.pop('db')
        self._data = {}

    @ConfigOpt(name='utils.tips', accepts=bool, default=True, options=options)
    async def tips(self, value: bool):
        '''Tips | Fire will sometimes add a helpful tip to the response from a command'''
        self._bot.logger.info(f'$GREENSetting $CYANutils.tips $GREENto $CYAN{value} $GREENfor user $CYAN{self._user}')
        await self.update('utils.tips', value)

    def get(self, option):
        if option not in self.options:
            raise InvalidOptionError(option)
        if self.options[option]['restricted'] and self._user.id not in self.options[option]['restricted']:
            return self.options[option]['default']  # Return default value if restricted :)
        if option not in self._data:
            return self.options[option]['default']  # Return default value if it's not even in the config :)
        accept = self.options[option]['accepts']
        acceptlist = False
        if isinstance(self._user, discord.User):
            converter = None
            if isinstance(accept, list):
                accept = accept[0]
                acceptlist = True
            if converter and inspect.ismethod(converter):
                if acceptlist:
                    return [converter(d) for d in self._data[option]]
                return converter(self._data[option])
            if inspect.isclass(accept):
                return accept(self._data[option])
        return self._data[option]

    async def set(self, opt: str, value):
        if not self.loaded:  # Since there's so many users, only those with non-default configs should be loaded
            await self.load()
        if opt not in self.options:
            raise InvalidOptionError(opt)
        option = self.options[opt]
        if value == option['default']:  # Bypass all checks if default
            await self.update(opt, value)
            return self.get(opt)
        if option['restricted'] and self._user.id not in option['restricted']:
            raise RestrictedOptionError(opt, 'select users only')
        setter = option['setter']
        if not inspect.isfunction(setter):
            raise OptionConfigError(option)
        if not isinstance(option['accepts'], list) and not isinstance(value, option['accepts']) and value is not None:
            raise TypeMismatchError(type=value.__class__.__name__, accepted=option['accepts'].__name__, option=opt)
        if isinstance(option['accepts'], list):
            accepts = option['accepts'][0]
            if not isinstance(value, list) or any(not isinstance(v, accepts) for v in value):
                if isinstance(value, list) and len(value) >= 1:
                    raise TypeMismatchError(type=[t.__class__.__name__ for t in value if not isinstance(t, accepts)], accepted=[t.__name__ for t in option['accepts']], option=opt)
                raise TypeMismatchError(type=value.__class__.__name__, accepted=option['accepts'].__class__.__name__, option=opt)
        await setter(self, value)
        return self.get(opt)

    async def update(self, option: str, value):
        changed = False # Don't need to save if nothing changed lol
        default = self.options[option]['default']
        if value == default:
            v = self._data.pop(option, None)
            changed = True if v else False
        elif self._data.get(option, None) != value:
            self._data[option] = value
            changed = True
        if changed:
            await self.save()

    async def load(self):
        if isinstance(self._user, int):
            self._user = self._bot.get_user(self._user)
        query = 'SELECT * FROM userconfig WHERE uid=$1;'
        conf = await self._db.fetch(query, self._user.id)
        if not conf:
            self._data = await self.init()
            self.loaded = True
        else:
            self._data = json.loads(conf[0]['data'])
            self.loaded = True

    async def save(self):
        con = await self._db.acquire()
        async with con.transaction():
            query = 'UPDATE userconfig SET data = $1 WHERE uid = $2;'
            await self._db.execute(query, json.dumps(self._data), self._user.id)
        await self._db.release(con)
        self._bot.logger.info(f'$GREENSaved config for $CYAN{self._user}')

    async def init(self):
        con = await self._db.acquire()
        async with con.transaction():
            query = 'INSERT INTO userconfig (\"uid\", \"data\") VALUES ($1, $2);'
            await self._db.execute(query, self._user.id, json.dumps({}))
        await self._db.release(con)
        self._bot.logger.info(f'$GREENInitiated config for $CYAN{self._user}')
        return {}

    def __repr__(self):
        return f'<UserConfig user={self._user} loaded={self.loaded}>'

    def __str__(self):
        return f'<UserConfig user={self._user} loaded={self.loaded}>'
