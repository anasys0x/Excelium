class Row:

    def __init__(self, index):
        self.index = index
        self.cells = []

    def add_cell(self, cell):
        self.cells.append(cell)

    def get_cells(self):
        return self.cells