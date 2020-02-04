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

DEFAULT_CONFIG = {}


def get_class_that_defined_method(meth):
    # meth must be a bound method
    if inspect.ismethod(meth):
        for cls in inspect.getmro(meth.__self__.__class__):
            print(cls)
            if cls.__dict__.get(meth.__name__) is meth:
                return cls
    return None  # not required since None would have been implicitly returned anyway


class Options:
    def __init__(self, func, **kwargs):
        self.func = func
        self.name = kwargs.pop('name')
        self.accepts = kwargs.pop('accepts', str)
        self.default = kwargs.pop('default', '')
        self.options = kwargs.pop('options')
        self.options[self.name] = {
            'setter': self.func,
            'accepts': self.accepts,
            'default': self.default
        }
        print(self.options)

    def __call__(self, value):
        f = self.func(self.parent, value)
        return f

    def __set_name__(self, owner, name):
        self.parent = owner


def ConfigOpt(**kwargs):
    def wrapper(func):
        return Options(func, **kwargs)
    return wrapper
