import ast
import asyncio
from pathlib import Path
from types import SimpleNamespace


MAIN_PATH = Path(__file__).resolve().parents[1].joinpath("main.py")


def load_analyze_ticket_with_mocks(ocr_text="[OCR_MARKER]"):
    tree = ast.parse(MAIN_PATH.read_text(encoding="utf-8"))
    analyze_ticket_node = next(
        node
        for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "analyze_ticket"
    )
    analyze_ticket_node.decorator_list = []

    captured = {}

    async def analyze_only(request_body):
        captured["delegated_text"] = request_body.text
        return {"delegated": True}

    namespace = {
        "Request": object,
        "TicketRequest": object,
        "analyze_only": analyze_only,
        "get_system_settings": lambda company: {
            "ai_confidence_threshold": 0.8,
            "duplicate_sensitivity": 0.85,
            "enable_auto_resolve": False,
        },
        "ocr_service": SimpleNamespace(extract_text=lambda image_base64: ocr_text),
    }
    module = ast.Module(body=[analyze_ticket_node], type_ignores=[])
    exec(compile(ast.fix_missing_locations(module), str(MAIN_PATH), "exec"), namespace)
    return namespace["analyze_ticket"], captured


def test_analyze_ticket_writes_ocr_enriched_text_before_delegating():
    analyze_ticket, captured = load_analyze_ticket_with_mocks()
    request_body = SimpleNamespace(
        text="User description",
        image_base64="fake_base64_data",
        company=None,
    )
    request = SimpleNamespace(
        client=SimpleNamespace(host="127.0.0.1"),
        headers={},
    )

    result = asyncio.run(analyze_ticket(request_body, request))

    assert result == {"delegated": True}
    assert request_body.text == "User description [OCR_MARKER]"
    assert captured["delegated_text"] == "User description [OCR_MARKER]"
