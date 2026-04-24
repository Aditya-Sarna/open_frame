"""Backend API tests for OpenFrame.

Covers all 6 endpoints in /app/backend/server.py:
  - GET  /api/
  - POST /api/parse-cobol   (LLM — real Claude call)
  - POST /api/map-schema    (LLM)
  - POST /api/pipeline/run  (deterministic simulator + Mongo persist)
  - GET  /api/runs          (Mongo read, must not leak _id)
  - POST /api/validate-data (LLM)
"""
from __future__ import annotations

import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

# LLM endpoints can take 10-40s — use a generous timeout.
LLM_TIMEOUT = 90
FAST_TIMEOUT = 30


SAMPLE_COPYBOOK = """\
       01  CUSTOMER-RECORD.
           05  CUST-ID           PIC 9(6).
           05  CUST-NAME         PIC X(30).
           05  CUST-BALANCE      PIC S9(9)V99 COMP-3.
           05  CUST-OPEN-DATE    PIC 9(8).
           05  CUST-STATUS       PIC X(1).
"""


@pytest.fixture(scope="session")
def client() -> requests.Session:
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --------------------------------------------------------------------------
# Health
# --------------------------------------------------------------------------
def test_health(client: requests.Session) -> None:
    r = client.get(f"{API}/", timeout=FAST_TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert data == {"service": "openframe", "status": "ok"}


# --------------------------------------------------------------------------
# parse-cobol
# --------------------------------------------------------------------------
class TestParseCobol:
    def test_parse_valid_copybook(self, client: requests.Session) -> None:
        r = client.post(
            f"{API}/parse-cobol",
            json={"copybook": SAMPLE_COPYBOOK},
            timeout=LLM_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data["record_name"], str) and data["record_name"]
        assert isinstance(data["total_bytes"], int) and data["total_bytes"] > 0
        assert isinstance(data["fields"], list) and len(data["fields"]) >= 3
        for f in data["fields"]:
            assert "name" in f and f["name"]
            assert "data_type" in f and f["data_type"]
        # Expose parsed fields for downstream map-schema test
        pytest.parsed_fields = data["fields"]

    def test_parse_rejects_short_input(self, client: requests.Session) -> None:
        r = client.post(f"{API}/parse-cobol", json={"copybook": "xx"}, timeout=FAST_TIMEOUT)
        assert r.status_code == 422


# --------------------------------------------------------------------------
# map-schema
# --------------------------------------------------------------------------
class TestMapSchema:
    def test_map_postgres(self, client: requests.Session) -> None:
        fields = getattr(pytest, "parsed_fields", None) or [
            {"level": "05", "name": "CUST-ID", "pic": "9(6)", "data_type": "numeric", "length": 6},
            {"level": "05", "name": "CUST-NAME", "pic": "X(30)", "data_type": "alphanumeric", "length": 30},
            {"level": "05", "name": "CUST-BALANCE", "pic": "S9(9)V99", "data_type": "comp-3", "length": 6},
        ]
        r = client.post(
            f"{API}/map-schema",
            json={"fields": fields, "target": "postgres", "table_name": "TEST_customers"},
            timeout=LLM_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["target"] == "postgres"
        # LLM may normalize table name to snake_case
        assert data["table_name"].lower() == "test_customers"
        assert isinstance(data["ddl"], str) and "CREATE TABLE" in data["ddl"].upper()
        assert isinstance(data["mappings"], list) and len(data["mappings"]) >= 1
        m = data["mappings"][0]
        for k in ("source_name", "source_type", "target_name", "target_type"):
            assert k in m and m[k]


# --------------------------------------------------------------------------
# pipeline/run  (simulator, no LLM)
# --------------------------------------------------------------------------
class TestPipelineRun:
    def test_run_and_persist(self, client: requests.Session) -> None:
        r = client.post(
            f"{API}/pipeline/run",
            json={
                "source_file": "TEST_CUSTOMERS.VSAM",
                "target": "postgres",
                "table_name": "TEST_run_persist",
                "ebcdic": True,
                "packed_decimal": True,
                "normalize_fields": True,
                "sample_rows": 5000,
            },
            timeout=FAST_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] and isinstance(data["id"], str)
        assert data["source_file"] == "TEST_CUSTOMERS.VSAM"
        assert data["target"] == "postgres"
        assert data["rows_processed"] >= 1000
        assert data["rows_processed"] == data["rows_ok"] + data["rows_failed"]
        assert len(data["stages"]) == 4
        stage_names = [s["stage"] for s in data["stages"]]
        assert stage_names == ["EXTRACT", "CONVERT", "TRANSFORM", "LOAD"]
        for s in data["stages"]:
            assert s["status"] in ("ok", "warn", "error")
            assert isinstance(s["lines"], list) and len(s["lines"]) >= 1
        assert data["throughput_rows_per_sec"] > 0
        pytest.last_run_id = data["id"]

    def test_runs_list_and_no_mongo_id_leak(self, client: requests.Session) -> None:
        r = client.get(f"{API}/runs?limit=10", timeout=FAST_TIMEOUT)
        assert r.status_code == 200
        runs = r.json()
        assert isinstance(runs, list) and len(runs) >= 1
        # Mongo _id must not leak
        for run in runs:
            assert "_id" not in run
            assert "id" in run and "stages" in run


# --------------------------------------------------------------------------
# validate-data
# --------------------------------------------------------------------------
class TestValidateData:
    def test_validate_sample(self, client: requests.Session) -> None:
        payload = {
            "table_name": "TEST_customers",
            "rules": [
                "primary key must be non-null and unique",
                "monetary amounts must be >= 0",
                "dates must be ISO-8601",
            ],
            "sample_rows": [
                {"cust_id": 1, "cust_name": "ALICE", "cust_balance": 120.50, "cust_open_date": "2020-01-15"},
                {"cust_id": 2, "cust_name": "BOB",   "cust_balance": -50.00, "cust_open_date": "2019-06-30"},
                {"cust_id": None, "cust_name": "CAROL","cust_balance": 10.00, "cust_open_date": "not-a-date"},
            ],
        }
        r = client.post(f"{API}/validate-data", json=payload, timeout=LLM_TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert 0 <= data["quality_score"] <= 100
        assert isinstance(data["total_rows"], int)
        assert isinstance(data["passed_rules"], int)
        assert isinstance(data["failed_rules"], int)
        assert isinstance(data["issues"], list)
        recon = data["reconciliation"]
        for k in ("source_rows", "target_rows", "drift_pct", "checksum_match"):
            assert k in recon
