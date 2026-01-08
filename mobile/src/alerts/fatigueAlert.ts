import { Vibration } from "react-native";
import { FatigueResult } from "../native/FatigueDetector";
import { FatigueLevel } from "../types/fatigue";

const CONFIDENCE_THRESHOLD = 0.7;
const ALERT_COOLDOWN_MS = 30_000;

const REQUIRED_WINDOWS: Record<FatigueLevel, number> = {
  LOW: Infinity,
  MEDIUM: 3,
  HIGH: 2,
};

let sustainedCount = 0;
let lastLevel: FatigueLevel | null = null;
let lastAlertTs = 0;

export function resetAlertState() {
  sustainedCount = 0;
  lastLevel = null;
  lastAlertTs = 0;
}

export function maybeTriggerAlert(result: FatigueResult) {
  const now = Date.now();

  // --------------------
  // HARD GATES
  // --------------------
  if (!result.faceDetected) {
    resetAlertState();
    return;
  }

  if (result.isCalibrating) {
    resetAlertState();
    return;
  }

  if (result.confidence < CONFIDENCE_THRESHOLD) {
    resetAlertState();
    return;
  }

  if (result.fatigueLevel === "LOW") {
    resetAlertState();
    return;
  }

  // --------------------
  // SUSTAINED COUNT
  // --------------------
  if (result.fatigueLevel === lastLevel) {
    sustainedCount++;
  } else {
    lastLevel = result.fatigueLevel;
    sustainedCount = 1;
  }

  const required = REQUIRED_WINDOWS[result.fatigueLevel];
  if (sustainedCount < required) return;

  // --------------------
  // COOLDOWN
  // --------------------
  if (now - lastAlertTs < ALERT_COOLDOWN_MS) return;

  // --------------------
  // TRIGGER ALERT
  // --------------------
  triggerAlert(result.fatigueLevel);
  lastAlertTs = now;
}

function triggerAlert(level: FatigueLevel) {
  if (level === "HIGH") {
    // Long vibration
    Vibration.vibrate([0, 800, 200, 800]);
  } else if (level === "MEDIUM") {
    // Short vibration
    Vibration.vibrate(400);
  }
}