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
class Shards:
    when: TIMESTR
    shard: TAG
    shard_id: INT


@lineprotocol
@dataclass
class Guilds:
    when: TIMESTR
    shard: TAG
    guilds: INT


@lineprotocol
@dataclass
class Users:
    when: TIMESTR
    shard: TAG
    total: INT
    online: INT


@lineprotocol
@dataclass
class Ping:
    when: TIMESTR
    shard: TAG
    heartbeat: INT


@lineprotocol
@dataclass
class SocketResponses:
    when: TIMESTR
    shard: TAG
    responses: INT


@lineprotocol
@dataclass
class Commands:
    when: TIMESTR
    shard: TAG
    total: INT


@lineprotocol
@dataclass
class Errors:
    when: TIMESTR
    shard: TAG
    total: INT


@lineprotocol
@dataclass
class Messages:
    when: TIMESTR
    shard: TAG
    total: INT


@lineprotocol
@dataclass
class Memory:
    when: TIMESTR
    shard: TAG
    used: INT
