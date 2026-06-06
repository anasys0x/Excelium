from transforms.type_transform import TypeTransform
from models.sql_type import SQLType


class BoolTransform(TypeTransform):

    def transform(self):
        return SQLType.BOOLEAN