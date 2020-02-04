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
