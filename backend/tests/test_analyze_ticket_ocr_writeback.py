from pathlib import Path


def test_analyze_ticket_writes_ocr_enriched_text_before_delegating():
    source = Path(__file__).resolve().parents[1].joinpath("main.py").read_text(encoding="utf-8")

    ocr_merge_index = source.index('text = f"{text} {local_ocr_text}".strip()')
    writeback_index = source.index("request_body.text = text", ocr_merge_index)
    delegation_index = source.index("return await analyze_only(request_body)", writeback_index)

    assert ocr_merge_index < writeback_index < delegation_index
