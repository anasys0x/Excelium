import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.excel.excel_type import Type
from models.relational.relational_type import RelationalType
from models.transforms.bool_transform import BoolTransform
from models.transforms.date_transform import DateTransform
from models.transforms.float_transform import FloatTransform
from models.transforms.int_transform import IntTransform
from models.transforms.mixed_transform import MixedTransform
from models.transforms.string_transform import StringTransform
from models.transforms.type_transform_factory import TypeTransformFactory


class TypeTransformFactoryTest(unittest.TestCase):
    def test_creates_the_matching_transform_for_each_type(self):
        cases = [
            (Type.INT, IntTransform),
            (Type.FLOAT, FloatTransform),
            (Type.DATE, DateTransform),
            (Type.BOOL, BoolTransform),
            (Type.MIXED, MixedTransform),
            (Type.STRING, StringTransform),
        ]
        for excel_type, expected_class in cases:
            self.assertIsInstance(TypeTransformFactory.create(excel_type), expected_class)

    def test_unknown_type_falls_back_to_string_transform(self):
        self.assertIsInstance(TypeTransformFactory.create(None), StringTransform)


class TransformResultsTest(unittest.TestCase):
    def test_each_transform_maps_to_a_valid_relational_type(self):
        cases = [
            (IntTransform(), RelationalType.INTEGER),
            (FloatTransform(), RelationalType.FLOAT),
            (DateTransform(), RelationalType.DATE),
            (BoolTransform(), RelationalType.BOOLEAN),
            (MixedTransform(), RelationalType.TEXT),
            (StringTransform(), RelationalType.TEXT),
        ]
        for transform, expected in cases:
            self.assertEqual(transform.transform(), expected, type(transform).__name__)


if __name__ == "__main__":
    unittest.main()
