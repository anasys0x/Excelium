from models.excel.excel_type import Type

from models.transforms.int_transform import IntTransform
from models.transforms.float_transform import FloatTransform
from models.transforms.string_transform import StringTransform
from models.transforms.date_transform import DateTransform
from models.transforms.bool_transform import BoolTransform
from models.transforms.mixed_transform import MixedTransform


class TypeTransformFactory:

    @staticmethod
    def create(excel_type):

        if excel_type == Type.INT:
            return IntTransform()

        if excel_type == Type.FLOAT:
            return FloatTransform()

        if excel_type == Type.DATE:
            return DateTransform()

        if excel_type == Type.BOOL:
            return BoolTransform()

        if excel_type == Type.MIXED:
            return MixedTransform()

        return StringTransform()