"""
Base Pydantic Model for Proxima.
Accepts both camelCase and snake_case input fields transparently.
Ensures backend models remain idiomatic snake_case while supporting frontend clients.
"""

import re
from typing import Any
from pydantic import BaseModel, model_validator


class SnakeBaseModel(BaseModel):
    """Base model that normalizes incoming camelCase keys to snake_case."""

    @model_validator(mode="before")
    @classmethod
    def convert_camel_to_snake(cls, data: Any) -> Any:
        if isinstance(data, dict):
            converted = {}
            for k, v in data.items():
                converted[k] = v
                snake_k = re.sub(r"(?<!^)(?=[A-Z])", "_", k).lower()
                converted[snake_k] = v
            return converted
        return data
