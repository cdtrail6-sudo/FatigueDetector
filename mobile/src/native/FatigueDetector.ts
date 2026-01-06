import { NativeModules } from "react-native";
import { FatigueLevel } from "../types/fatigue";

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

type FatigueDetectorModule = {
  analyzeFrame(base64: string): Promise<FatigueResult>;
  analyzeFrameFromPath(path: string): Promise<FatigueResult>; // ✅ ADDED
  resetState(): void;
};

const { FatigueDetector } = NativeModules as {
  FatigueDetector: FatigueDetectorModule;
};

if (__DEV__ && !FatigueDetector) {
  throw new Error("FatigueDetector native module not linked");
}

export default {
  analyzeFrame(base64: string): Promise<FatigueResult> {
    return FatigueDetector.analyzeFrame(base64);
  },

  analyzeFrameFromPath(path: string): Promise<FatigueResult> {
    return FatigueDetector.analyzeFrameFromPath(path);
  },

  resetState(): void {
    FatigueDetector.resetState();
  },
};