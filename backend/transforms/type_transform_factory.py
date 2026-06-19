from models.excel.excel_type import Type

from transforms.int_transform import IntTransform
from transforms.float_transform import FloatTransform
from transforms.string_transform import StringTransform
from transforms.date_transform import DateTransform
from transforms.bool_transform import BoolTransform
from transforms.mixed_transform import MixedTransform


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