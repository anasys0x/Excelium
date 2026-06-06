class Workbook:

    def __init__(self, file_name, file_path):
        self.file_name = file_name
        self.file_path = file_path

        self.worksheets = []

    def add_worksheet(self, worksheet):
        self.worksheets.append(worksheet)

    def get_worksheets(self):
        return self.worksheets