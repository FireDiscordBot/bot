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
        self._data: dict = self.get_default_config()

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
            self._data[option] = self.options[option]['default']  # Ensure the value actually exists
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
        changed = False
        for option in self.options:
            if option not in self._data:
                self._bot.logger.info(f'$GREENAdding option $CYAN{option} $GREENfor user $CYAN{self._user}')
                self._data[option] = self.options[opt]['default']
                changed = True
        if changed:
            await self.save()
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
        default = self.options[option]['default']
        if value == default and option in self._data:
            self._data.pop(option)
        else:
            self._data[option] = value
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
        await self._bot.wait_until_ready()
        changed = False
        keys = self._data.copy().keys()
        for opt in keys:
            try:
                val = self.get(opt)
            except InvalidOptionError:
                self._bot.logger.warn(f'$YELLOWRemoving invalid option $CYAN{opt} $GREENfor user $CYAN{self._user}')
                self._data.pop(opt)
                changed = True
                continue
            default = self.options[opt]['default']
            if val == default and opt in self._data:
                self._data.pop(opt)
                changed = True
                continue
            accepts = self.options[opt]['accepts']
            if not isinstance(accepts, list) and (not isinstance(val, accepts) or val is None) and opt in self._data:
                self._bot.logger.info(f'$GREENSetting option $CYAN{opt} $GREENto default for user $CYAN{self._user} $GREENdue to mismatched types')
                self._data.pop(opt)
                changed = True
            elif isinstance(accepts, list) and opt in self._data:
                if not isinstance(val, list):
                    self._bot.logger.info(f'$GREENSetting option $CYAN{opt} $GREENto default for user $CYAN{self._user} $GREENdue to mismatched types')
                    self._data.pop(opt)
                    changed = True
                elif val and not isinstance(val[0], accepts[0]):
                    self._bot.logger.info(f'$GREENSetting option $CYAN{opt} $GREENto default for user $CYAN{self._user} $GREENdue to mismatched types')
                    self._data.pop(opt)
                    changed = True
        if changed:
            await self.save()

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
            await self._db.execute(query, self._user.id, json.dumps(self.get_default_config()))
        await self._db.release(con)
        self._bot.logger.info(f'$GREENInitiated config for $CYAN{self._user}')
        return self.get_default_config()

    def get_default_config(self):
        conf = {}
        for opt in self.options:
            conf[opt] = self.options[opt]['default']
        return conf

    def __repr__(self):
        return f'<UserConfig user={self._user} loaded={self.loaded}>'

    def __str__(self):
        return f'<UserConfig user={self._user} loaded={self.loaded}>'
