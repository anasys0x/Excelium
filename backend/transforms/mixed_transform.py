from transforms.type_transform import TypeTransform
from models.sql_type import SQLType


class MixedTransform(TypeTransform):

    def transform(self):
        return SQLType.TEXT