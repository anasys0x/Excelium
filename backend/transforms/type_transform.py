from abc import ABC, abstractmethod


class TypeTransform(ABC):

    @abstractmethod
    def transform(self):
        pass