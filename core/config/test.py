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


from constants import DEFAULT_CONFIG, ConfigOpt
import asyncio
import inspect


options = dict()


class test():
    def __init__(self):
        self.options = options
        print(self.options)

    @ConfigOpt(name='test', accepts=str, default='Hello, World!', options=options)
    async def testopt(self, value):
        print(value)
        print('testopt success')

    @ConfigOpt(name='ender.gae', accepts=bool, default=True, options=options)
    async def endergae(self, value):
        if value:
            print('ender is gae')
        else:
            print('ender is not gae')

    async def set(self, option: str, value, reset: bool = False):
        if option not in self.options:
            raise Exception('option not in self.options')  # Change this to custom exception
        option = self.options[option]
        optsetter = option['setter']
        if not inspect.isfunction(optsetter):
            raise Exception('setter is not a function')  # Change this to custom exception
        if reset:
            value = option['default']
        if not isinstance(value, option['accepts']):
            raise Exception('value is not accepted by this setting')  # Change this to custom exception
        await optsetter(self, value)


print('defining oof')
oof = test()
print('calling set()')
asyncio.get_event_loop().run_until_complete(oof.set('ender.gae', True))
