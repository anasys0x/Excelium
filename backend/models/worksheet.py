class Worksheet:

    def __init__(self, name, index):
        self.name = name
        self.index = index

        self.rows = []
        self.columns = []
        self.has_header = False

    def add_row(self, row):
        self.rows.append(row)

    def add_column(self, column):
        self.columns.append(column)

    def get_rows(self):
        return self.rows

    def get_columns(self):
        return self.columns
    
    def set_has_header(self, has_header):
        self.has_header = has_header