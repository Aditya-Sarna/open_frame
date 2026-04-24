"""OpenFrame — Mainframe Data Modernization backend.

Endpoints mirror the original Next.js repo structure but now served by FastAPI:
  POST /api/parse-cobol      Parse a COBOL copybook into structured fields.
  POST /api/map-schema       Map parsed fields to a target cloud DB schema.
  POST /api/pipeline/run     Run a (simulated) migration pipeline end-to-end.
  POST /api/validate-data    Validate sample records, return quality score + anomalies.
  GET  /api/runs             Recent persisted pipeline runs.
  GET  /api/                 Health.
"""
from __future__ import annotations

import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from groq import AsyncGroq

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------------------------------------------------------------------------
# Infrastructure
# ---------------------------------------------------------------------------

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
LLM_MODEL = "llama-3.3-70b-versatile"

app = FastAPI(title="OpenFrame API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger("openframe")


# ---------------------------------------------------------------------------
# LLM helpers
# ---------------------------------------------------------------------------

async def _llm_chat(system_message: str, user_message: str) -> str:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured on server.")
    client_groq = AsyncGroq(api_key=GROQ_API_KEY)
    completion = await client_groq.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ],
        temperature=0.1,
    )
    return completion.choices[0].message.content


def _extract_json(text: str) -> Any:
    """Pull a JSON object/array out of an LLM response, tolerating fences."""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find the first {...} or [...] block
        for opener, closer in (("{", "}"), ("[", "]")):
            start = text.find(opener)
            end = text.rfind(closer)
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(text[start : end + 1])
                except json.JSONDecodeError:
                    continue
        raise HTTPException(status_code=502, detail="LLM returned non-JSON output.")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ParseCobolRequest(BaseModel):
    copybook: str = Field(..., min_length=4, description="Raw COBOL copybook text")


class ParsedField(BaseModel):
    level: Optional[str] = None
    name: str
    pic: Optional[str] = None
    data_type: str
    length: Optional[int] = None
    usage: Optional[str] = None
    redefines: Optional[str] = None
    description: Optional[str] = None


class ParseCobolResponse(BaseModel):
    record_name: str
    fields: List[ParsedField]
    total_bytes: int
    notes: Optional[str] = None


TargetDb = Literal["postgres", "bigquery", "snowflake"]


class MapSchemaRequest(BaseModel):
    fields: List[ParsedField]
    target: TargetDb = "postgres"
    table_name: Optional[str] = None


class MappedField(BaseModel):
    source_name: str
    source_type: str
    target_name: str
    target_type: str
    nullable: bool = True
    transform: Optional[str] = None
    rationale: Optional[str] = None


class MapSchemaResponse(BaseModel):
    target: TargetDb
    table_name: str
    ddl: str
    mappings: List[MappedField]


class PipelineRunRequest(BaseModel):
    source_file: str = Field(..., description="e.g. CUSTOMERS.VSAM")
    target: TargetDb = "postgres"
    table_name: Optional[str] = None
    ebcdic: bool = True
    packed_decimal: bool = True
    normalize_fields: bool = True
    sample_rows: int = 10_000


class PipelineStageLog(BaseModel):
    stage: str
    status: Literal["ok", "warn", "error"]
    duration_ms: int
    lines: List[str]


class PipelineRunResponse(BaseModel):
    id: str
    source_file: str
    target: TargetDb
    table_name: str
    started_at: str
    finished_at: str
    rows_processed: int
    rows_ok: int
    rows_failed: int
    throughput_rows_per_sec: float
    stages: List[PipelineStageLog]


class ValidateDataRequest(BaseModel):
    table_name: str
    sample_rows: List[Dict[str, Any]] = Field(default_factory=list)
    rules: Optional[List[str]] = None


class ValidationIssue(BaseModel):
    severity: Literal["critical", "high", "medium", "low"]
    field: Optional[str] = None
    row_index: Optional[int] = None
    rule: str
    message: str


class ValidateDataResponse(BaseModel):
    quality_score: float
    total_rows: int
    passed_rules: int
    failed_rules: int
    issues: List[ValidationIssue]
    reconciliation: Dict[str, Any]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@api_router.get("/")
async def root() -> Dict[str, str]:
    return {"service": "openframe", "status": "ok"}


@api_router.post("/parse-cobol", response_model=ParseCobolResponse)
async def parse_cobol(req: ParseCobolRequest) -> ParseCobolResponse:
    system = (
        "You are an expert COBOL copybook parser. "
        "Given a copybook, return a STRICT JSON object with this schema: "
        '{"record_name": str, "total_bytes": int, "notes": str|null, '
        '"fields": [{"level": str, "name": str, "pic": str|null, '
        '"data_type": str, "length": int|null, "usage": str|null, '
        '"redefines": str|null, "description": str|null}]}. '
        "`data_type` must be one of: alphanumeric, numeric, decimal, signed, "
        "comp-3, comp, binary, date, group. "
        "Compute length in bytes for PIC clauses (e.g. PIC X(10) -> 10, PIC 9(5)V99 COMP-3 -> 4). "
        "Return ONLY JSON, no prose."
    )
    raw = await _llm_chat(system, f"Parse this COBOL copybook:\n\n{req.copybook}")
    data = _extract_json(raw)
    try:
        parsed = ParseCobolResponse.model_validate(data)
    except Exception as exc:  # noqa: BLE001
        logger.exception("parse-cobol validation failed")
        raise HTTPException(status_code=502, detail=f"LLM response schema invalid: {exc}")

    doc = {
        "id": str(uuid.uuid4()),
        "kind": "parse",
        "record_name": parsed.record_name,
        "field_count": len(parsed.fields),
        "total_bytes": parsed.total_bytes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.events.insert_one(doc)
    return parsed


@api_router.post("/map-schema", response_model=MapSchemaResponse)
async def map_schema(req: MapSchemaRequest) -> MapSchemaResponse:
    target_types = {
        "postgres": "Postgres 15 (use TEXT, VARCHAR(n), INTEGER, BIGINT, NUMERIC(p,s), DATE, TIMESTAMPTZ, BOOLEAN)",
        "bigquery": "BigQuery (use STRING, INT64, NUMERIC, BIGNUMERIC, FLOAT64, DATE, TIMESTAMP, BOOL)",
        "snowflake": "Snowflake (use VARCHAR, NUMBER(p,s), FLOAT, DATE, TIMESTAMP_NTZ, BOOLEAN)",
    }[req.target]
    table_name = req.table_name or "migrated_record"
    system = (
        f"You are a data architect migrating COBOL/mainframe records to {target_types}. "
        "Given a list of parsed fields, produce a STRICT JSON object: "
        '{"target": str, "table_name": str, "ddl": str, '
        '"mappings": [{"source_name": str, "source_type": str, "target_name": str, '
        '"target_type": str, "nullable": bool, "transform": str|null, '
        '"rationale": str|null}]}. '
        "Normalize source names to snake_case for target_name. "
        "Include a transform string when EBCDIC, COMP-3, sign, or date reformatting is needed. "
        "`ddl` must be a valid CREATE TABLE statement for the target. "
        "Return ONLY JSON."
    )
    raw = await _llm_chat(system, json.dumps(payload))
    data = _extract_json(raw)
    data.setdefault("target", req.target)
    data.setdefault("table_name", table_name)
    try:
        mapped = MapSchemaResponse.model_validate(data)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"LLM response schema invalid: {exc}")
    await db.events.insert_one(
        {
            "id": str(uuid.uuid4()),
            "kind": "map",
            "target": mapped.target,
            "table_name": mapped.table_name,
            "field_count": len(mapped.mappings),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return mapped


@api_router.post("/pipeline/run", response_model=PipelineRunResponse)
async def pipeline_run(req: PipelineRunRequest) -> PipelineRunResponse:
    """Simulates a migration pipeline and persists the run.

    The output is deterministic-ish and meant to drive a realistic terminal UI.
    """
    import random

    started = datetime.now(timezone.utc)
    random.seed(hash(req.source_file + req.target))
    rows = max(1_000, req.sample_rows)
    failed = random.randint(0, max(1, rows // 500))
    ok = rows - failed
    duration_total = random.randint(1800, 4200)
    table_name = req.table_name or "migrated_record"

    stages: List[PipelineStageLog] = [
        PipelineStageLog(
            stage="EXTRACT",
            status="ok",
            duration_ms=random.randint(200, 500),
            lines=[
                f"$ openframe extract --source {req.source_file}",
                "» opening VSAM dataset in read-only mode",
                f"» {rows:,} records located across 3 physical extents",
                "» extract OK",
            ],
        ),
        PipelineStageLog(
            stage="CONVERT",
            status="ok",
            duration_ms=random.randint(400, 900),
            lines=[
                "» detected encoding: EBCDIC (IBM-1047)" if req.ebcdic else "» encoding already ASCII, skipping",
                "» converting EBCDIC → UTF-8" if req.ebcdic else "» bypassing EBCDIC conversion",
                "» decoding COMP-3 packed decimal fields" if req.packed_decimal else "» no packed decimals in payload",
                "» convert OK",
            ],
        ),
        PipelineStageLog(
            stage="TRANSFORM",
            status="warn" if failed else "ok",
            duration_ms=random.randint(500, 1200),
            lines=[
                "» normalizing field names to snake_case" if req.normalize_fields else "» preserving original field names",
                "» trimming trailing low-values and PIC padding",
                f"» {failed} rows flagged for review" if failed else "» all rows transformed cleanly",
            ],
        ),
        PipelineStageLog(
            stage="LOAD",
            status="ok",
            duration_ms=random.randint(700, 1600),
            lines=[
                f"» streaming into {req.target}.{table_name}",
                f"» committed {ok:,} rows across 12 batches",
                f"» load OK in {duration_total} ms",
            ],
        ),
    ]

    finished = datetime.now(timezone.utc)
    run = PipelineRunResponse(
        id=str(uuid.uuid4()),
        source_file=req.source_file,
        target=req.target,
        table_name=table_name,
        started_at=started.isoformat(),
        finished_at=finished.isoformat(),
        rows_processed=rows,
        rows_ok=ok,
        rows_failed=failed,
        throughput_rows_per_sec=round(rows / max(1, duration_total) * 1000, 1),
        stages=stages,
    )
    await db.runs.insert_one(run.model_dump())
    return run


@api_router.get("/runs")
async def list_runs(limit: int = 10) -> List[Dict[str, Any]]:
    docs = (
        await db.runs.find({}, {"_id": 0})
        .sort("finished_at", -1)
        .to_list(length=max(1, min(limit, 100)))
    )
    return docs


@api_router.post("/validate-data", response_model=ValidateDataResponse)
async def validate_data(req: ValidateDataRequest) -> ValidateDataResponse:
    system = (
        "You are a data-quality auditor for freshly migrated mainframe data. "
        "Given sample rows and optional rule hints, return STRICT JSON: "
        '{"quality_score": float (0-100), "total_rows": int, "passed_rules": int, '
        '"failed_rules": int, "reconciliation": {"source_rows": int, "target_rows": int, '
        '"drift_pct": float, "checksum_match": bool}, '
        '"issues": [{"severity": "critical"|"high"|"medium"|"low", '
        '"field": str|null, "row_index": int|null, "rule": str, "message": str}]}. '
        "Detect: null violations, type mismatches, out-of-range values, "
        "orphaned foreign keys, date-format drift, EBCDIC residue (non-printable bytes). "
        "Return ONLY JSON."
    )
    payload = {
        "table_name": req.table_name,
        "rules": req.rules or [
            "primary key must be non-null and unique",
            "monetary amounts must be >= 0",
            "dates must be ISO-8601",
            "no EBCDIC residue",
        ],
        "sample_rows": req.sample_rows[:50],
    }
    raw = await _llm_chat(system, json.dumps(payload))
    data = _extract_json(raw)
    try:
        report = ValidateDataResponse.model_validate(data)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"LLM response schema invalid: {exc}")
    await db.events.insert_one(
        {
            "id": str(uuid.uuid4()),
            "kind": "validate",
            "table_name": req.table_name,
            "quality_score": report.quality_score,
            "issue_count": len(report.issues),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return report


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    client.close()
