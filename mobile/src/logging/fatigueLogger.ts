import { FatigueWindowLog, LOG_SCHEMA_VERSION } from "./schemas";
import { storeWindowLog } from "../storage/fatigueStorage";

export function logFatigueWindow(params: {
  sessionId: string;
  deviceHash: string;
  fatigue: any;
  windowDurationMs: number;
  scanIntervalMs: number;
  faceDetectedRatio: number;
}) {
  const { fatigue } = params;

  // Confidence gate
  if (fatigue.confidence < 0.4) return;

  const log: FatigueWindowLog = {
    schemaVersion: LOG_SCHEMA_VERSION,

    sessionId: params.sessionId,
    deviceHash: params.deviceHash,
    platform: "android",

    timestamp: Date.now(),
    windowDurationMs: params.windowDurationMs,

    baselineEAR: fatigue.baselineEAR ?? -1,

    normalizedEARMean: fatigue.normalizedEARMean ?? 0,
    normalizedEARVariance: fatigue.normalizedEARVariance ?? 0,

    blinkRate: fatigue.blinkRate,
    blinkEntropy: fatigue.blinkEntropy,
    perclos: fatigue.perclos,
    sustainedLowEAR: fatigue.sustainedLowEAR ?? false,

    fatigueLevel: fatigue.fatigueLevel,
    confidence: fatigue.confidence,

    unstableSignal: fatigue.unstableSignal ?? false,
    lowLiveness: fatigue.blinkEntropy < 0.9,

    scanIntervalMs: params.scanIntervalMs,
    faceDetectedRatio: params.faceDetectedRatio,
  };

  storeWindowLog(log);
}