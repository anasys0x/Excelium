from transforms.type_transform import TypeTransform
from models.sql_type import SQLType


class FloatTransform(TypeTransform):

    def transform(self):
        return SQLType.DOUBLE_PRECISION