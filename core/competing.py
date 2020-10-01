from discord import BaseActivity, ActivityType

class Competing(BaseActivity):

    __slots__ = ('name')

    def __init__(self, name, **extra):
        super().__init__(**extra)
        self.name = name

    @property
    def type(self):
        return ActivityType.competing

    def __str__(self):
        return str(self.name)

    def __repr__(self):
        return '<Competing name={0.name!r}>'.format(self)

    def to_dict(self):

        return {
            'type': ActivityType.competing.value,
            'name': str(self.name),
        }

    def __eq__(self, other):
        return isinstance(other, Competing) and other.name == self.name

    def __ne__(self, other):
        return not self.__eq__(other)

    def __hash__(self):
        return hash(self.name)