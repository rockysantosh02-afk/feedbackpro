"""Unit tests for CSV formula injection sanitizer."""

from app.security.csv_sanitizer import CSVSanitizer


def test_csv_formula_injection_triggers():
    # Trigger: =
    assert CSVSanitizer.sanitize_field("=cmd") == "'=cmd"
    assert CSVSanitizer.sanitize_field("=SUM(A1:A2)") == "'=SUM(A1:A2)"

    # Trigger: @
    assert CSVSanitizer.sanitize_field("@SUM(1+2)") == "'@SUM(1+2)"

    # Trigger: +
    assert CSVSanitizer.sanitize_field("+123") == "'+123"

    # Trigger: -
    assert CSVSanitizer.sanitize_field("-123") == "'-123"

    # Trigger: \t and \r
    assert CSVSanitizer.sanitize_field("\tsecret") == "'\tsecret"
    assert CSVSanitizer.sanitize_field("\rcommand") == "'\rcommand"


def test_csv_safe_fields_unchanged():
    assert CSVSanitizer.sanitize_field("Project Alpha") == "Project Alpha"
    assert CSVSanitizer.sanitize_field("Clean text description") == "Clean text description"
    assert CSVSanitizer.sanitize_field(100) == "100"
    assert CSVSanitizer.sanitize_field("") == ""
    assert CSVSanitizer.sanitize_field(None) == ""


def test_csv_sanitize_rows():
    row = ["=cmd", "Regular Name", "+44123456", "@malicious"]
    sanitized = CSVSanitizer.sanitize_row(row)
    assert sanitized == ["'=cmd", "Regular Name", "'+44123456", "'@malicious"]
