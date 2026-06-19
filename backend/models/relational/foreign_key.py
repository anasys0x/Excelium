from models.relational.constraint import Constraint


class ForeignKey(Constraint):

    def __init__(self, column_name, ref_table, ref_column):
        super().__init__("FOREIGN KEY")
        self.column_name = column_name
        self.ref_table = ref_table
        self.ref_column = ref_column

    def to_sql(self):
        return (
            f"FOREIGN KEY ({self.column_name}) "
            f"REFERENCES {self.ref_table} ({self.ref_column})"
        )
