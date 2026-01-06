from app.schemas.window_log import WindowLog
from app.schemas.session_summary import SessionSummary

CONFIDENCE_THRESHOLD = 0.4


async def save_window_log(log: WindowLog):
    if log.confidence < CONFIDENCE_THRESHOLD:
        return {"skipped": True}

    # Phase-2 stub
    print("Saved WindowLog:", log.dict())
    return {"ok": True}


async def save_session_summary(summary: SessionSummary):
    print("Saved SessionSummary:", summary.dict())
    return {"ok": True}
