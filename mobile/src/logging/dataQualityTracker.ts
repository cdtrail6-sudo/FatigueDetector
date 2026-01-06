import { FatigueLevel } from "../types/fatigue";

export type DataQualitySnapshot = {
  totalFrames: number;
  faceDetectedFrames: number;
  calibrationFrames: number;
  validFatigueFrames: number;
  droppedFrames: number;
  lowConfidenceFrames: number;
  highFatigueFrames: number;
  avgConfidence: number;
};

let totalFrames = 0;
let faceDetectedFrames = 0;
let calibrationFrames = 0;
let validFatigueFrames = 0;
let droppedFrames = 0;
let lowConfidenceFrames = 0;
let highFatigueFrames = 0;
let confidenceSum = 0;

export function recordFrame(fatigue: {
  faceDetected: boolean;
  isCalibrating: boolean;
  fatigueLevel: FatigueLevel;
  confidence: number;
}) {
  totalFrames++;

  if (!fatigue.faceDetected) {
    droppedFrames++;
    return;
  }

  faceDetectedFrames++;

  if (fatigue.isCalibrating) {
    calibrationFrames++;
    return;
  }

  if (fatigue.confidence < 0.4) {
    lowConfidenceFrames++;
    return;
  }

  validFatigueFrames++;
  confidenceSum += fatigue.confidence;

  if (fatigue.fatigueLevel === "HIGH") {
    highFatigueFrames++;
  }
}

export function getDataQualitySnapshot(): DataQualitySnapshot {
  return {
    totalFrames,
    faceDetectedFrames,
    calibrationFrames,
    validFatigueFrames,
    droppedFrames,
    lowConfidenceFrames,
    highFatigueFrames,
    avgConfidence:
      validFatigueFrames > 0
        ? confidenceSum / validFatigueFrames
        : 0,
  };
}

export function resetDataQuality() {
  totalFrames = 0;
  faceDetectedFrames = 0;
  calibrationFrames = 0;
  validFatigueFrames = 0;
  droppedFrames = 0;
  lowConfidenceFrames = 0;
  highFatigueFrames = 0;
  confidenceSum = 0;
}