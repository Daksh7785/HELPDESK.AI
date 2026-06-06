from pathlib import Path


SOURCE = Path(__file__).resolve().parents[1].joinpath("main.py").read_text(encoding="utf-8")


def test_ticket_request_accepts_company_id():
    ticket_request_block = SOURCE.split("class TicketRequest(BaseModel):", 1)[1].split("class TicketSaveRequest", 1)[0]

    assert "company_id: str | None = None" in ticket_request_block


def test_settings_lookups_use_company_id_helper():
    assert "def get_request_company_id" in SOURCE
    assert "request_body.company_id or resolve_company_name_to_id(request_body.company)" in SOURCE
    assert "get_system_settings(request_body.company)" not in SOURCE
    assert SOURCE.count("get_system_settings(get_request_company_id(request_body))") == 3
