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

from aioinflux import *
from dataclasses import dataclass


@lineprotocol
@dataclass
class Guilds:
    when: TIMEDT
    shard: TAG
    guilds: int


@lineprotocol
@dataclass
class Users:
    when: TIMEDT
    shard: TAG
    total: int
    online: int


@lineprotocol
@dataclass
class Ping:
    when: TIMEDT
    shard: TAG
    heartbeat: int


@lineprotocol
@dataclass
class SocketResponses:
    when: TIMEDT
    shard: TAG
    responses: int


@lineprotocol
@dataclass
class Commands:
    when: TIMEDT
    shard: TAG
    total: int
    session: int


@lineprotocol
@dataclass
class Errors:
    when: TIMEDT
    shard: TAG
    total: int
    session: int


# @lineprotocol
# @dataclass
# class Memory:
#     when: TIMEDT
#     shard: TAG
#     total: int
#     used: int
