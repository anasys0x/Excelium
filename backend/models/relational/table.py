class Table:

    def __init__(self, name):
        self.name = name
        self.columns = []
        self.rows = []
        self.constraints = []

    def add_column(self, column):
        self.columns.append(column)

    def get_columns(self):
        return self.columns

    def add_row(self, row):
        self.rows.append(row)

    def get_rows(self):
        return self.rows

    def add_constraint(self, constraint):
        self.constraints.append(constraint)

    def get_constraints(self):
        return self.constraints

    def is_empty(self):
        return len(self.rows) == 0
