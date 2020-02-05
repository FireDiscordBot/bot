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


from constants import ConfigOpt
import discord
import inspect
import json


options = dict()


class config:
    def __init__(self, guild, **kwargs):
        self._bot = kwargs.pop('bot')
        self._guild: discord.Guild = self._bot.get_guild(guild)
        self._db = kwargs.pop('db')
        self._data: dict
        self.options = options

    @ConfigOpt(name='log.moderation', accepts=int, default=0, options=options)
    async def modlogs(self, value: int):
        channel = self._bot.get_channel(value)
        if not channel or not isinstance(channel, discord.TextChannel):
            raise Exception  # Change this to custom exception
        await self.update('log.moderation', value)

    async def get(self, option):
        if option not in self.options:
            raise Exception  # Change this to custom exception
        return self._data[option]

    async def set(self, option: str, value, reset: bool = False):
        if option not in self.options:
            raise Exception  # Change this to custom exception
        option = self.options[option]
        setter = option['setter']
        if not inspect.isfunction(setter):
            raise Exception  # Change this to custom exception
        if reset:
            value = option['default']
        if not isinstance(option['accepts'], list) and not isinstance(value, option['accepts']):
            raise Exception  # Change this to custom exception
        elif isinstance(option['accepts'], list):
            accepts = option['accepts'][0]
            if not isinstance(value, list) or any(v for v in value if not isinstance(v, accepts)):
                raise Exception
        await setter(self, value)
        return self.get(option)

    async def update(self, option: str, value):
        self._data[option] = value
        await self.save()

    async def load(self):
        query = 'SELECT * FROM config WHERE gid=$1;'
        conf = await self._db.fetch(query, self._guild.id)
        if not conf:
            self._data = await self.init()
            return
        self._data = json.loads(conf[0]['data'])
        self._bot.logger(f'$GREENLoaded config for $BLUE{self._guild}')

    async def save(self):
        con = await self._db.acquire()
        async with con.transaction():
            q = 'UPDATE config SET data = $1 WHERE gid = $2;'
            await self._db.execute(q, json.dumps(self._data), self._guild.id)
        await self._db.release(con)
        self._bot.logger(f'$GREENSaved config for $BLUE{self._guild}')

    async def init(self):
        con = await self._db.acquire()
        async with con.transaction():
            query = 'INSERT INTO config (\"gid\", \"data\") VALUES ($1, $2);'
            await self._db.execute(q, self._guild.id, json.dumps(self.getDefaultConfig()))
        await self._db.release(con)
        self._bot.logger(f'$GREENInitiated config for $BLUE{self._guild}')
        return self.getDefaultConfig()

    def getDefaultConfig(self):
        conf = {}
        for opt in self.options:
            conf[opt] = self.options[opt]['default']
        return conf
