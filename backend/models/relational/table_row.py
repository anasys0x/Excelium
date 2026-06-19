class TableRow:

    def __init__(self, values):
        # values : dict {column_name: value}
        self.values = values

    def get(self, column_name):
        return self.values.get(column_name)
