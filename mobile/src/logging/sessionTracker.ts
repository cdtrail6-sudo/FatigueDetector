// mobile/src/logging/sessionTracker.ts

import { FatigueSessionSummary, LOG_SCHEMA_VERSION } from "./schemas";
import { storeSessionSummary } from "../storage/fatigueStorage";
import { FatigueLevel } from "../types/fatigue";

let startTime = Date.now();
let confidenceSum = 0;
let count = 0;

const fatigueCounts: Record<FatigueLevel, number> = {
  LOW: 0,
  MEDIUM: 0,
  HIGH: 0,
};

export function trackFatigue(fatigue: {
  fatigueLevel: FatigueLevel;
  confidence: number;
}) {
  fatigueCounts[fatigue.fatigueLevel]++;
  confidenceSum += fatigue.confidence;
  count++;
}

export function startSession(sessionId: string) {
  startTime = Date.now();
  confidenceSum = 0;
  count = 0;
  fatigueCounts.LOW = 0;
  fatigueCounts.MEDIUM = 0;
  fatigueCounts.HIGH = 0;
}

export function endSession(sessionId: string) {
  const endTime = Date.now();
  const total = Math.max(1, count);

  const summary: FatigueSessionSummary = {
    schemaVersion: LOG_SCHEMA_VERSION,

    sessionId,
    startTime,
    endTime,
    durationMs: endTime - startTime,

    avgConfidence: confidenceSum / total,

    peakFatigueLevel:
      fatigueCounts.HIGH > 0
        ? "HIGH"
        : fatigueCounts.MEDIUM > 0
        ? "MEDIUM"
        : "LOW",

    fatigueDistribution: {
      LOW: fatigueCounts.LOW / total,
      MEDIUM: fatigueCounts.MEDIUM / total,
      HIGH: fatigueCounts.HIGH / total,
    },

    baselineSuccessful: true, // Phase-1 OK
    alertCount: 0,
  };

  storeSessionSummary(summary);

  // 🔁 RESET FOR NEXT SESSION
  startTime = Date.now();
  confidenceSum = 0;
  count = 0;

  fatigueCounts.LOW = 0;
  fatigueCounts.MEDIUM = 0;
  fatigueCounts.HIGH = 0;
}