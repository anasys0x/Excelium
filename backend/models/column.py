class Column:

    def __init__(
        self,
        name,
        index,
        letter
    ):
        self.name = name
        self.index = index
        self.letter = letter

        self.detected_type = None
        self.transform = None

        self.is_primary_key = False

    def set_detected_type(self, detected_type):
        self.detected_type = detected_type

    def set_transform(self, transform):
        self.transform = transform

    def get_sql_type(self):
        if self.transform is None:
            return None

        return self.transform.transform()
    
    def set_primary_key(self, is_primary_key):
        self.is_primary_key = is_primary_key