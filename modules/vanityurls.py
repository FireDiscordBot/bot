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

from fire.filters.invite import findinvite
from fire.exceptions import PushError
from discord.ext import commands
from fire.push import pushover
from fire import slack
import datetime
import discord
import typing
import re


class VanityURLs(commands.Cog, name="Vanity URLs"):
    def __init__(self, bot):
        self.bot = bot
        self.bot.vanity_urls = {}
        self.bot.get_vanity = self.get
        self.bot.vanity_click = self.click
        self.bot.vanity_link = self.link
        if 'slack_messages' not in dir(self.bot):
            self.bot.slack_messages = {}
        self.bot.loop.create_task(self.load())

    def get(self, vanity: typing.Union[int, str]):
        if isinstance(vanity, int):
            for v in self.bot.vanity_urls:
                v = self.bot.vanity_urls[v]
                if v['gid'] == vanity:
                    return v
        elif isinstance(vanity, str):
            if vanity.lower() in self.bot.vanity_urls:
                return self.bot.vanity_urls[vanity.lower()]
        return False

    async def click(self, code: str):
        code = code.lower()
        query = 'SELECT * FROM vanity WHERE code = $1;'
        current = await self.bot.db.fetch(query, code)
        if not current:
            return
        clicks = current[0]['clicks'] + 1
        con = await self.bot.db.acquire()
        async with con.transaction():
            query = 'UPDATE vanity SET clicks = $2 WHERE code = $1;'
            await self.bot.db.execute(query, code, clicks)
        await self.bot.db.release(con)
        self.bot.vanity_urls[code]['clicks'] += 1

    async def link(self, code: str):
        code = code.lower()
        query = 'SELECT * FROM vanity WHERE code = $1;'
        current = await self.bot.db.fetch(query, code)
        if not current:
            return
        links = current[0]['links'] + 1
        con = await self.bot.db.acquire()
        async with con.transaction():
            query = 'UPDATE vanity SET links = $2 WHERE code = $1;'
            await self.bot.db.execute(query, code, links)
        await self.bot.db.release(con)
        self.bot.vanity_urls[code]['links'] += 1

    @commands.Cog.listener()
    async def on_vanity_delete(self, vanity: dict):
        guild = self.bot.get_guild(vanity['gid'])
        if not guild:
            return
        config = self.bot.get_config(guild)
        if config.get('utils.public') and not self.get(guild.id):
            await config.set('utils.public', False)
            log = config.get('log.action')
            if log:
                return await log.send('<:major_outage:685538400639385706> This server has been removed from Fire\'s public server list as it\'s vanity url was deleted')

    async def create(
        self,
        ctx: commands.Context,
        code: str,
        inv: discord.Invite
    ):
        code = code.lower()
        query = 'SELECT * FROM vanity WHERE gid = $1;'
        current = await self.bot.db.fetch(query, ctx.guild.id)
        if not current:
            con = await self.bot.db.acquire()
            async with con.transaction():
                query = 'INSERT INTO vanity (\"gid\", \"code\", \"invite\") VALUES ($1, $2, $3);'
                await self.bot.db.execute(query, ctx.guild.id, code, inv.code)
            await self.bot.db.release(con)
        else:
            con = await self.bot.db.acquire()
            async with con.transaction():
                query = 'UPDATE vanity SET (\"code\", \"invite\") = ($2, $3) WHERE gid = $1;'
                await self.bot.db.execute(query, ctx.guild.id, code, inv.code)
            await self.bot.db.release(con)
        self.bot.vanity_urls[code.lower()] = {
            'gid': ctx.guild.id,
            'invite': inv.code,
            'code': code,
            'clicks': 0,
            'links': 0
        }
        return self.bot.vanity_urls[code.lower()]

    async def delete_ctx(self, ctx: commands.Context):
        self.bot.logger.warn(f'$YELLOWDeleting vanity for guild $CYAN{ctx.guild}')
        current = await self.bot.db.fetch(
            'SELECT * FROM vanity WHERE gid=$1;',
            ctx.guild.id
        )
        if current:
            con = await self.bot.db.acquire()
            async with con.transaction():
                query = 'DELETE FROM vanity WHERE gid = $1;'
                await self.bot.db.execute(query, ctx.guild.id)
            await self.bot.db.release(con)
            for v in current:
                self.bot.dispatch(
                    'vanity_delete',
                    self.bot.vanity_urls.pop(v['code'].lower())
                )

    async def delete_code(self, code: str):
        self.bot.logger.warn(f'$YELLOWDeleting vanity for code $CYAN{code}')
        current = await self.bot.db.fetch(
            'SELECT * FROM vanity WHERE code=$1;',
            code
        )
        if current:
            con = await self.bot.db.acquire()
            async with con.transaction():
                query = 'DELETE FROM vanity WHERE code = $1;'
                await self.bot.db.execute(query, code)
            await self.bot.db.release(con)
            self.bot.dispatch(
                'vanity_delete',
                self.bot.vanity_urls.pop(code.lower())
            )

    async def delete_guild(self, gid: int):
        current = await self.bot.db.fetch(
            'SELECT * FROM vanity WHERE gid=$1;',
            gid
        )
        if current:
            con = await self.bot.db.acquire()
            async with con.transaction():
                query = 'DELETE FROM vanity WHERE gid = $1;'
                await self.bot.db.execute(query, gid)
            await self.bot.db.release(con)
            for v in current:
                self.bot.dispatch(
                    'vanity_delete',
                    self.bot.vanity_urls.pop(v['code'].lower())
                )

    async def delete(self, vanity: typing.Union[commands.Context, int, str]):
        if isinstance(vanity, commands.Context):
            await self.delete_ctx(vanity)
        elif isinstance(vanity, int):
            await self.delete_guild(vanity)
        elif isinstance(vanity, str):
            await self.delete_code(vanity)

    async def load(self):  # GREP loadvanitys
        await self.bot.wait_until_ready()
        self.bot.logger.info(f'$YELLOWLoading vanity urls...')
        self.bot.vanity_urls = {}
        query = 'SELECT * FROM vanity WHERE redirect IS NULL;'
        vanitys = await self.bot.db.fetch(query)
        for v in vanitys:
            guild = v['gid']
            code = v['code'].lower()
            invite = v['invite']
            clicks = v['clicks']
            links = v['links']
            self.bot.vanity_urls[code] = {
                'gid': guild,
                'invite': invite,
                'code': code,
                'clicks': clicks,
                'links': links
            }
        self.bot.logger.info(f'$GREENLoaded vanity urls!')

    async def current_embed(self, ctx, current):
        gmembers = f'⭘ {len(ctx.guild.members):,d} Members'
        desc = ctx.config.get('main.description') or f'Check out {ctx.guild} on Discord'
        desc = f'[{ctx.guild}]({current.get("url", "https://inv.wtf/")})\n{desc}\n\n{gmembers}'
        embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=desc)
        if not ctx.guild.splash_url and not ctx.guild.banner_url:
            embed.set_thumbnail(url=str(ctx.guild.icon_url))
        else:
            embed.set_image(url=f'https://inv.wtf/splash/{ctx.guild.id}')
        embed.add_field(name='Clicks', value=current['clicks'])
        embed.add_field(name='Links', value=current['links'])
        embed.add_field(name='URL', value=f'https://inv.wtf/{current["code"]}', inline=False)
        return await ctx.send(embed=embed)

    @commands.command(description='Creates a vanity invite for your Discord using https://inv.wtf/')
    @commands.has_permissions(manage_guild=True)
    @commands.guild_only()
    async def vanityurl(self, ctx, code: str = None):
        premium = self.bot.premium_guilds
        current = self.get(ctx.guild.id)
        if not code and (not ctx.guild.id in premium or not current):
            return await ctx.error('You need to provide a code or "delete" to delete the current vanity!')
        elif not code and current:
            return await self.current_embed(ctx, current)
        if code.lower() in ['remove', 'delete', 'true', 'yeet', 'disable']:
            await self.delete(ctx)
            return await ctx.success('Vanity URL deleted!')
        if not re.fullmatch(r'[a-zA-Z0-9]+', code):
            return await ctx.error('Vanity URLs can only contain characters A-Z0-9')
        if len(code) < 3 or len(code) > 10:
            return await ctx.error('The code needs to be 3-10 characters!')
        exists = self.get(code.lower())
        redirexists = self.bot.get_redirect(code.lower())
        if exists or redirexists:
            return await ctx.error('This code is already in use!')
        if not ctx.guild.me.guild_permissions.create_instant_invite:
            raise commands.BotMissingPermissions(['create_instant_invite'])
        if ctx.guild.me.guild_permissions.manage_guild and 'VANITY_URL' in ctx.guild.features:
            createdinv = await ctx.guild.vanity_invite()
        else:
            createdinv = await ctx.channel.create_invite(reason='Creating invite for Vanity URL')
        vanity = await self.create(ctx, code.lower(), createdinv)
        if vanity:
            author = str(ctx.author).replace('#', '%23')
            if not self.bot.dev:
                try:
                    slackmsg = await slack.sendvanity(f'/{code}', ctx.author, ctx.guild)
                    self.bot.slack_messages[f'vanity_{ctx.guild.id}'] = slackmsg
                except PushError as e:
                    self.bot.logger.error(f'$REDUnable to send Vanity URL to Slack!', exc_info=e)
                    if 'vanityapiurl' not in self.bot.config:
                        self.bot.config['vanityurlapi'] = 'https://http.cat/404'
                    await pushover(f'{author} ({ctx.author.id}) has created the Vanity URL `https://inv.wtf/{vanity["code"]}` for {ctx.guild.name}', url=self.bot.config['vanityurlapi'], url_title='Check current Vanity URLs')
            else:
                await pushover(f'{author} ({ctx.author.id}) has created the Vanity URL `https://inv.wtf/{vanity["code"]}` for {ctx.guild.name}', url=self.bot.config['vanityurlapi'], url_title='Check current Vanity URLs')
            return await ctx.success(f'Your Vanity URL is https://inv.wtf/{code}')
        else:
            return await ctx.error('Something went wrong...')


def setup(bot):
    bot.add_cog(VanityURLs(bot))
    bot.logger.info(f'$GREENLoaded $CYANVanity URLs $GREENmodule!')
