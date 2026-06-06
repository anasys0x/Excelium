from transforms.type_transform import TypeTransform
from models.sql_type import SQLType


class StringTransform(TypeTransform):

    def transform(self):
        return SQLType.VARCHAR