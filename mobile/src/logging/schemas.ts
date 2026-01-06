// Schema version
export const LOG_SCHEMA_VERSION = "2.0";

export type FatigueWindowLog = {
  schemaVersion: string;

  sessionId: string;
  deviceHash: string;
  platform: "android";

  timestamp: number;
  windowDurationMs: number;

  baselineEAR: number;

  normalizedEARMean: number;
  normalizedEARVariance: number;

  blinkRate: number;
  blinkEntropy: number;
  perclos: number;
  sustainedLowEAR: boolean;

  fatigueLevel: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;

  unstableSignal: boolean;
  lowLiveness: boolean;

  scanIntervalMs: number;
  faceDetectedRatio: number;
};

export type FatigueSessionSummary = {
  schemaVersion: string;

  sessionId: string;
  startTime: number;
  endTime: number;
  durationMs: number;

  avgConfidence: number;
  peakFatigueLevel: "LOW" | "MEDIUM" | "HIGH";

  fatigueDistribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };

  baselineSuccessful: boolean;
  alertCount: number;
};