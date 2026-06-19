from transforms.type_transform import TypeTransform
from models.relational.relational_type import RelationalType


class MixedTransform(TypeTransform):

    def transform(self):
        return RelationalType.TEXT