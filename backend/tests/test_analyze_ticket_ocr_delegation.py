import ast
from pathlib import Path


def _load_main_tree():
    main_path = Path(__file__).resolve().parents[1] / "main.py"
    return ast.parse(main_path.read_text(encoding="utf-8"))


def _find_async_functions(tree, name):
    matches = []
    for node in tree.body:
        if isinstance(node, ast.AsyncFunctionDef) and node.name == name:
            matches.append(node)
    if not matches:
        raise AssertionError(f"{name} function not found")
    return matches


def _find_primary_analyze_ticket(tree):
    for node in _find_async_functions(tree, "analyze_ticket"):
        has_enriched_copy = any(
            isinstance(child, ast.Call)
            and isinstance(child.func, ast.Attribute)
            and child.func.attr == "model_copy"
            for child in ast.walk(node)
        )
        if has_enriched_copy:
            return node
    raise AssertionError("primary analyze_ticket function not found")


def test_analyze_ticket_delegates_ocr_enriched_request_with_current_user():
    tree = _load_main_tree()
    analyze_ticket = _find_primary_analyze_ticket(tree)

    analyze_only_calls = [
        node for node in ast.walk(analyze_ticket)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "analyze_only"
    ]

    assert analyze_only_calls, "analyze_ticket should delegate to analyze_only"
    call = analyze_only_calls[-1]
    assert len(call.args) >= 3
    assert isinstance(call.args[0], ast.Name)
    assert call.args[0].id == "enriched"
    assert isinstance(call.args[2], ast.Name)
    assert call.args[2].id == "current_user"


def test_analyze_ticket_preserves_ocr_text_in_model_copy_update():
    tree = _load_main_tree()
    analyze_ticket = _find_primary_analyze_ticket(tree)

    model_copy_calls = [
        node for node in ast.walk(analyze_ticket)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "model_copy"
    ]

    assert model_copy_calls, "analyze_ticket should build an enriched request"
    update_keyword = next(
        keyword for keyword in model_copy_calls[-1].keywords
        if keyword.arg == "update"
    )
    assert isinstance(update_keyword.value, ast.Dict)

    update_keys = {
        key.value for key in update_keyword.value.keys
        if isinstance(key, ast.Constant)
    }
    assert {"text", "image_text"}.issubset(update_keys)
