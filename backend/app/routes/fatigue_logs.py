from fastapi import APIRouter, HTTPException

from app.schemas.window_log import WindowLog
from app.schemas.session_summary import SessionSummary
from app.services.aggregation import (
    save_window_log,
    save_session_summary,
)

router = APIRouter(prefix="/fatigue", tags=["fatigue"])


@router.post("/window")
async def ingest_window_log(payload: WindowLog):
    """
    High-frequency window ingestion.
    """
    try:
        return await save_window_log(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session")
async def ingest_session_summary(payload: SessionSummary):
    """
    Session-level summary ingestion.
    """
    try:
        return await save_session_summary(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))