from models.transforms.type_transform import TypeTransform
from models.relational.relational_type import RelationalType


class StringTransform(TypeTransform):

    def transform(self):
        return RelationalType.VARCHAR