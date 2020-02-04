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
