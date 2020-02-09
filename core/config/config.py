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


from .constants import ConfigOpt, DISCORD_CONVERTERS
from .errors import *
import discord
import inspect
import json


options = dict()


class Config:
    def __init__(self, guild, **kwargs):
        self._bot = kwargs.pop('bot')
        self._guild: discord.Guild = self._bot.get_guild(guild)
        self._db = kwargs.pop('db')
        self._data: dict
        self.options = options

    @ConfigOpt(name='main.prefix', accepts=str, default='$', options=options)
    async def prefix(self, value: str):
        '''The prefix used before all Fire commands'''
        self._bot.logger.info(f'$GREENSetting $BLUEmain.prefix $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('main.prefix', value)

    @ConfigOpt(name='main.description', accepts=str, default=None, options=options)
    async def description(self, value: str):
        '''The server description, shown in the embed for Vanity URLs'''
        if len(value) > 240:
            raise InvalidValueError('main.description', value, 'Descriptions must be 240 characters or less.')
        self._bot.logger.info(f'$GREENSetting $BLUEmain.description $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('main.description', value)

    @ConfigOpt(name='log.moderation', accepts=discord.TextChannel, default=None, options=options)
    async def mod_logs(self, value: discord.TextChannel):
        '''The channel where moderation actions are logged'''
        self._bot.logger.info(f'$GREENSetting $BLUElog.moderation $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('log.moderation', value.id)

    @ConfigOpt(name='log.action', accepts=discord.TextChannel, default=None, options=options)
    async def action_logs(self, value: discord.TextChannel):
        '''The channel where miscellaneous actions are logged, e.g. deleted messages'''
        self._bot.logger.info(f'$GREENSetting $BLUElog.action $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('log.action', value.id)

    @ConfigOpt(name='mod.linkfilter', accepts=[str], default=[], options=options)
    async def link_filter(self, value: list):
        '''The filters of which any links found will be deleted unless a user has Manage Messages permission'''
        valid = ['discord', 'youtube', 'twitch', 'twitter', 'paypal', 'malware']
        if any(v not in valid for v in value):
            raise TypeMismatchError(type=', '.join([v for v in value if v not in valid]), accepted=', '.join(valid), option='mod.linkfilter')
        self._bot.logger.info(f'$GREENSetting $BLUEmod.linkfilter $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('mod.linkfilter', value)

    @ConfigOpt(name='mod.dupecheck', accepts=bool, default=False, options=options)
    async def dupe_check(self, value: bool):
        '''The deletion of duplicate messages'''
        self._bot.logger.info(f'$GREENSetting $BLUEmod.dupecheck $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('mod.dupecheck', value)

    @ConfigOpt(name='excluded.filter', accepts=[int], default=[], options=options)
    async def filter_exclude(self, value: list):
        '''Channel, role and user IDs that are excluded from link filters and duplicate message deletion'''
        self._bot.logger.info(f'$GREENSetting $BLUEexcluded.filter $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('excluded.filter', value)

    @ConfigOpt(name='mod.globalbans', accepts=bool, default=False, options=options)
    async def global_bans(self, value: bool):
        '''Global ban checking on member join, powered by KSoft.Si API'''
        self._bot.logger.info(f'$GREENSetting $BLUEmod.globalbans $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('mod.globalbans', value)

    @ConfigOpt(name='mod.autodecancer', accepts=bool, default=False, options=options)
    async def auto_decancer(self, value: bool):
        '''Renames those with "cancerous" names (non-ascii chars) to John Doe'''
        self._bot.logger.info(f'$GREENSetting $BLUEmod.autodecancer $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('mod.autodecancer', value)

    @ConfigOpt(name='mod.autodehoist', accepts=bool, default=False, options=options)
    async def auto_dehoist(self, value: bool):
        '''Renames those with "hoisted" names (starts with non a-z char) to John Doe'''
        self._bot.logger.info(f'$GREENSetting $BLUEmod.autodehoist $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('mod.autodehoist', value)

    @ConfigOpt(name='commands.modonly', accepts=[discord.TextChannel], default=[], options=options)
    async def mod_only(self, value: list):
        '''The channels where only moderators can run commands'''
        self._bot.logger.info(f'$GREENSetting $BLUEcommands.modonly $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('commands.modonly', [c.id for c in value])

    @ConfigOpt(name='commands.adminonly', accepts=[discord.TextChannel], default=[], options=options)
    async def mod_only(self, value: list):
        '''The channels where only admins can run commands'''
        self._bot.logger.info(f'$GREENSetting $BLUEcommands.adminonly $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('commands.adminonly', [c.id for c in value])

    @ConfigOpt(name='mod.antiraid', accepts=discord.TextChannel, default=None, options=options, premium=True)
    async def anti_raid(self, value: discord.TextChannel):
        '''The channel where raid alerts are sent'''
        self._bot.logger.info(f'$GREENSetting $BLUEmod.antiraid $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('mod.antiraid', value.id)

    @ConfigOpt(name='mod.autorole', accepts=discord.Role, default=None, options=options, premium=True)
    async def auto_role(self, value: discord.Role):
        '''The role given to users upon joining the server'''
        self._bot.logger.info(f'$GREENSetting $BLUEmod.autorole $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('mod.antiraid', value.id)

    @ConfigOpt(name='greet.joinchannel', accepts=discord.TextChannel, default=None, options=options)
    async def join_channel(self, value: discord.TextChannel):
        '''The channel where join messages are sent'''
        self._bot.logger.info(f'$GREENSetting $BLUEgreet.joinchannel $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('greet.joinchannel', value.id)

    @ConfigOpt(name='greet.leavechannel', accepts=discord.TextChannel, default=None, options=options)
    async def leave_channel(self, value: discord.TextChannel):
        '''The channel where leave messages are sent'''
        self._bot.logger.info(f'$GREENSetting $BLUEgreet.leavechannel $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('greet.leavechannel', value.id)

    @ConfigOpt(name='greet.joinmsg', accepts=str, default='Welcome {user}!', options=options)
    async def join_message(self, value: str):
        '''The server's custom join message'''
        self._bot.logger.info(f'$GREENSetting $BLUEgreet.joinmsg $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('greet.joinmsg', value)

    @ConfigOpt(name='greet.leavemsg', accepts=str, default='Goodbye {user}!', options=options)
    async def leave_message(self, value: str):
        '''The server's custom leave message'''
        self._bot.logger.info(f'$GREENSetting $BLUEgreet.leavemsg $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('greet.leavemsg', value)

    @ConfigOpt(name='disabled.commands', accepts=[str], default=[], options=options)
    async def disabled_commands(self, value: list):
        '''Commands that can only be ran by moderators (those with Manage Messages permission)'''
        if [v for v in value if not self._bot.get_command(v)]:
            raise TypeMismatchError(type=', '.join([v for v in value if not self._bot.get_command(v)]), accepted=', '.join([cmd.name for cmd in self._bot.commands if not cmd.hidden]), option='disabled.commands')
        self._bot.logger.info(f'$GREENSetting $BLUEdisabled.commands $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('disabled.commands', value)

    @ConfigOpt(name='disabled.cogs', accepts=[str], default=[], options=options)
    async def disabled_cogs(self, value: list):
        '''Modules that can only be ran by moderators (those with Manage Messages permission)'''
        if [v for v in value if not self._bot.get_cog(v)]:
            raise TypeMismatchError(type=', '.join([v for v in value if not self._bot.get_cog(v)]), accepted=', '.join([cog.name for cog in self._bot.cogs if not cog.hidden]), option='disabled.cogs')
        self._bot.logger.info(f'$GREENSetting $BLUEdisabled.cogs $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('disabled.cogs', value)

    @ConfigOpt(name='utils.autoquote', accepts=bool, default=False, options=options)
    async def auto_quote(self, value: bool):
        '''Automatically quotes messages when a message link is sent'''
        self._bot.logger.info(f'$GREENSetting $BLUEutils.autoquote $GREENto $BLUE{value} $GREENfor guild $BLUE{self._guild}')
        await self.update('utils.autoquote', value)

    def get(self, option):
        if option not in self.options:
            raise InvalidOptionError(option)
        accept = self.options[option]['accepts']
        acceptlist = False
        converter = None
        if isinstance(accept, list):
            accept = accept[0]
            acceptlist = True
        if accept in DISCORD_CONVERTERS['bot']:
            converter = getattr(self._bot, DISCORD_CONVERTERS['bot'][accept])
        elif accept in DISCORD_CONVERTERS['guild']:
            converter = getattr(self._guild, DISCORD_CONVERTERS['guild'][accept])
        if converter and inspect.ismethod(converter):
            if acceptlist:
                return [converter(d) for d in self._data[option]]
            return converter(self._data[option])
        return self._data[option]

    async def set(self, opt: str, value):
        if opt not in self.options:
            raise InvalidOptionError(opt)
        option = self.options[opt]
        if option['premium'] and self._guild.id not in self._bot.premiumGuilds:
            raise RestrictedOptionError(option, 'premium guilds only')
        if option['restricted'] and self._guild.id not in option['restricted']:
            raise RestrictedOptionError(option, 'select guilds only')
        if value == option['default']:  # Bypass all checks if default
            await self.update(opt, value)
            return self.get(opt)
        setter = option['setter']
        if not inspect.isfunction(setter):
            raise OptionConfigError(option)
        if not isinstance(option['accepts'], list) and not isinstance(value, option['accepts']) and value is not None:
            raise TypeMismatchError(type=str(type(value)), accepted=str(option['accepts']), option=option)
        if isinstance(option['accepts'], list):
            accepts = option['accepts'][0]
            if not isinstance(value, list) or any(v for v in value if not isinstance(v, accepts)):
                raise TypeMismatchError(type=str(type(value)), accepted=str(option['accepts']), option=option)
        await setter(self, value)
        return self.get(opt)

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
        changed = False
        for opt in self.options:
            if opt not in self._data:
                self._data[opt] = self.options[opt]['default']
                changed = True
        if changed:
            await self.save()
        # self._bot.logger.info(f'$GREENLoaded config for $BLUE{self._guild}')
        # this would be spammy boi every time ready is dispatched

    async def save(self):
        con = await self._db.acquire()
        async with con.transaction():
            query = 'UPDATE config SET data = $1 WHERE gid = $2;'
            await self._db.execute(query, json.dumps(self._data), self._guild.id)
        await self._db.release(con)
        self._bot.logger.info(f'$GREENSaved config for $BLUE{self._guild}')

    async def init(self):
        con = await self._db.acquire()
        async with con.transaction():
            query = 'INSERT INTO config (\"gid\", \"data\") VALUES ($1, $2);'
            await self._db.execute(query, self._guild.id, json.dumps(self.get_default_config()))
        await self._db.release(con)
        self._bot.logger.info(f'$GREENInitiated config for $BLUE{self._guild}')
        return self.get_default_config()

    def get_default_config(self):
        conf = {}
        for opt in self.options:
            conf[opt] = self.options[opt]['default']
        return conf
