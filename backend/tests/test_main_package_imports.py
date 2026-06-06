from pathlib import Path


def test_main_uses_package_safe_imports_for_local_modules():
    source = (Path(__file__).resolve().parents[2] / "backend" / "main.py").read_text(encoding="utf-8")

    assert "from encryption import" not in source
    assert "from pii_redaction import" not in source
    assert "from backend.encryption import encrypt_pii, decrypt_pii, is_encrypted" in source
    assert "from backend.pii_redaction import" in source
