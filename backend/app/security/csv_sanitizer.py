"""CSV Formula Injection Sanitizer.

Prevents CSV/Spreadsheet Formula Injection (DDE attacks) by neutralizing cells
starting with formula triggers (=, +, -, @, \\t, \\r).
"""

from typing import Any


class CSVSanitizer:
    FORMULA_TRIGGERS = ("=", "+", "-", "@", "\t", "\r")

    @classmethod
    def sanitize_field(cls, value: Any) -> str:
        """Sanitizes a single field for CSV export.

        If the field begins with =, +, -, @, \\t, or \\r, it prefixes it with a single quote.
        """
        if value is None:
            return ""

        str_val = str(value)
        if not str_val:
            return ""

        # Check if the stripped string starts with any formula trigger
        if str_val.startswith(cls.FORMULA_TRIGGERS):
            return f"'{str_val}"

        return str_val

    @classmethod
    def sanitize_row(cls, row: list[Any]) -> list[str]:
        """Sanitizes a full row of CSV data."""
        return [cls.sanitize_field(item) for item in row]

    @classmethod
    def sanitize_rows(cls, rows: list[list[Any]]) -> list[list[str]]:
        """Sanitizes multiple rows of CSV data."""
        return [cls.sanitize_row(r) for r in rows]
