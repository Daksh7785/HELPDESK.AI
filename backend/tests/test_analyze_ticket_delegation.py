import ast
from pathlib import Path


def test_analyze_ticket_delegates_current_user_to_analyze_only():
    source = (Path(__file__).resolve().parents[2] / "backend" / "main.py").read_text(encoding="utf-8")
    tree = ast.parse(source)

    analyze_ticket = next(
        node
        for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "analyze_ticket"
        and any(arg.arg == "current_user" for arg in node.args.args)
    )
    analyze_only_calls = [
        node
        for node in ast.walk(analyze_ticket)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "analyze_only"
    ]

    assert analyze_only_calls
    delegated_args = analyze_only_calls[-1].args
    assert isinstance(delegated_args[2], ast.Name)
    assert delegated_args[2].id == "current_user"
