import { NativeModules } from "react-native";
import { FatigueLevel } from "../types/fatigue";

/**
 * Result returned from native MediaPipe analyzer
 * MUST stay in sync with FatigueResult.java
 */
export type FatigueResult = {
  faceDetected: boolean;
  isCalibrating: boolean;

  leftEAR: number;
  rightEAR: number;
  avgEAR: number;

  blinkDetected: boolean;
  blinkRate: number;
  blinkEntropy: number;

  perclos: number;
  fatigueLevel: FatigueLevel;
  confidence: number;

  timestamp: number;
};

/**
 * Native module interface
 */
type FatigueDetectorModule = {
  analyzeFrame(base64: string): Promise<FatigueResult>;
  analyzeFrameFromPath(path: string): Promise<FatigueResult>;
  resetState(): void;
};

const Native = NativeModules as {
  FatigueDetector?: FatigueDetectorModule;
};

const FatigueDetector = Native.FatigueDetector;

if (__DEV__ && !FatigueDetector) {
  throw new Error(
    "FatigueDetector native module not linked. Rebuild the app."
  );
}

/**
 * JS wrapper
 */
export default {
  analyzeFrame(base64: string): Promise<FatigueResult> {
    return FatigueDetector!.analyzeFrame(base64);
  },

  analyzeFrameFromPath(path: string): Promise<FatigueResult> {
    return FatigueDetector!.analyzeFrameFromPath(path);
  },

  /**
   * Resets native temporal + baseline state
   * Should be called ONLY when session continuity breaks
   */
  resetState(): void {
    FatigueDetector!.resetState();
  },
};