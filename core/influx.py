from aioinflux import *
from typing import NamedTuple

@lineprotocol
class Guilds(NamedTuple):
    when: TIMEDT
    shard: TAG
    guilds: int

@lineprotocol
class Users(NamedTuple):
    when: TIMEDT
    shard: TAG
    total: int
    online: int

@lineprotocol
class Ping(NamedTuple):
    when: TIMEDT
    shard: TAG
    heartbeat: int

@lineprotocol
class SocketResponses(NamedTuple):
    when: TIMEDT
    shard: TAG
    responses: int

@lineprotocol
class Commands(NamedTuple):
    when: TIMEDT
    shard: TAG
    total: int
    session: int

@lineprotocol
class Errors(NamedTuple):
    when: TIMEDT
    shard: TAG
    total: int
    session: int

@lineprotocol
class Memory(NamedTuple):
    when: TIMEDT
    shard: TAG
    total: int
    used: int
