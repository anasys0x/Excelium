class Table:

    def __init__(self, name, index):
        self.name = name
        self.index = index

        self.rows = []
        self.columns = []
        self.has_header = False

    def add_row(self, row):
        self.rows.append(row)

    def get_rows(self):
        return self.rows

    def add_column(self, column):
        self.columns.append(column)

    def get_columns(self):
        return self.columns

    def set_has_header(self, has_header):
        self.has_header = has_header

    def get_has_header(self):
        return self.has_header

    def get_header(self):
        if not self.has_header:
            return []
        return [col.name for col in self.columns]

    def is_empty(self):
        return len(self.rows) == 0
