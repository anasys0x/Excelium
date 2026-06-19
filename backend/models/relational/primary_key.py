from models.relational.constraint import Constraint


class PrimaryKey(Constraint):

    def __init__(self, column_name):
        super().__init__("PRIMARY KEY")
        self.column_name = column_name

    def to_sql(self):
        return f"PRIMARY KEY ({self.column_name})"
