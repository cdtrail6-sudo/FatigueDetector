from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

FatigueLevel = Literal["LOW", "MEDIUM", "HIGH"]


class WindowLog(BaseModel):
    # -------------------------
    # Schema metadata
    # -------------------------
    schemaVersion: str

    # -------------------------
    # Session / device
    # -------------------------
    sessionId: str
    deviceHash: str
    platform: Optional[str] = None  # android / ios / web

    # -------------------------
    # Time window
    # -------------------------
    timestamp: int = Field(
        ...,
        description="Client-side epoch timestamp (ms)"
    )
    windowDurationMs: int

    # -------------------------
    # Baseline & normalized eye metrics
    # -------------------------
    baselineEAR: Optional[float] = None

    normalizedEARMean: Optional[float] = None
    normalizedEARVariance: Optional[float] = None

    # -------------------------
    # Blink & fatigue metrics
    # -------------------------
    blinkRate: float
    blinkEntropy: float
    perclos: float
    sustainedLowEAR: bool

    fatigueLevel: FatigueLevel
    confidence: float = Field(..., ge=0.0, le=1.0)

    # -------------------------
    # Data quality flags (CRITICAL FOR ML)
    # -------------------------
    unstableSignal: bool
    lowLiveness: bool

    # -------------------------
    # Capture characteristics
    # -------------------------
    scanIntervalMs: int
    faceDetectedRatio: float = Field(..., ge=0.0, le=1.0)

    # -------------------------
    # Server-side timestamps (optional)
    # -------------------------
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
