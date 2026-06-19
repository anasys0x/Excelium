class Constraint:

    def __init__(self, name):
        self.name = name

    def to_sql(self):
        raise NotImplementedError
