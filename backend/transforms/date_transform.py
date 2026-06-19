from transforms.type_transform import TypeTransform
from models.relational.relational_type import RelationalType


class DateTransform(TypeTransform):

    def transform(self):
        return RelationalType.DATE