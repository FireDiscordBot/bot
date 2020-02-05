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


import functools
import inspect
import discord

from discord.ext.commands.converter import (
    MemberConverter,
    UserConverter,
    RoleConverter,
    TextChannelConverter,
    VoiceChannelConverter,
    CategoryChannelConverter
)


class Options:
    def __init__(self, func, **kwargs):
        self.func = func
        self.name = kwargs.pop('name')
        self.accepts = kwargs.pop('accepts', str)
        self.default = kwargs.pop('default', '')
        self.options = kwargs.pop('options')
        self.restricted = kwargs.pop('restrict', [])
        self.premium = kwargs.pop('premium', False)
        self.options[self.name] = {
            'setter': self.func,
            'description': sef.func.__doc__ or 'No Description Set',
            'accepts': self.accepts,
            'default': self.default,
            'restricted': self.restricted,
            'premium': self.premium
        }

    def __call__(self, value):
        f = self.func(self.parent, value)
        return f

    def __set_name__(self, owner, name):
        self.parent = owner


def ConfigOpt(**kwargs):
    def wrapper(func):
        return Options(func, **kwargs)
    return wrapper


DISCORD_CONVERTERS = {
    'bot': {
        discord.TextChannel: 'get_channel',
        discord.VoiceChannel: 'get_channel',
        discord.CategoryChannel: 'get_channel',
        discord.User: 'get_user'
    },
    'guild': {
        discord.Member: 'get_member',
        discord.Role: 'get_role'
    }
}
