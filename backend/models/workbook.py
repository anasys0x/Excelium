class Workbook:

    def __init__(self, file_name, file_path):
        self.file_name = file_name
        self.file_path = file_path

        self.worksheets = []
        self.dependencies = []

    def add_worksheet(self, worksheet):
        self.worksheets.append(worksheet)

    def get_worksheets(self):
        return self.worksheets
    
    def add_dependency(self, dependency):
        self.dependencies.append(dependency)

    def get_dependencies(self):
        return self.dependencies

    def is_empty(self):
        return len(self.worksheets) == 0