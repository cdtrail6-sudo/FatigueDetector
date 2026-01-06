from pydantic import BaseModel
from typing import Dict, Literal

FatigueLevel = Literal["LOW", "MEDIUM", "HIGH"]

class SessionSummary(BaseModel):
    schemaVersion: str
    sessionId: str

    startTime: int
    endTime: int
    durationMs: int

    avgConfidence: float
    peakFatigueLevel: FatigueLevel

    fatigueDistribution: Dict[FatigueLevel, float]

    baselineSuccessful: bool
    alertCount: int
