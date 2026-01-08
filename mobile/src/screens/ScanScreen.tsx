import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Button,
  Linking,
  StyleSheet,
  AppState,
  Pressable,
} from "react-native";
import { Camera, useCameraDevices } from "react-native-vision-camera";
import { useNavigation, useIsFocused } from "@react-navigation/native";

import FatigueDetector, { FatigueResult } from "../native/FatigueDetector";
import { startSession, endSession } from "../logging/sessionTracker";
import { FatigueLevel } from "../types/fatigue";
import { storeWindowLog } from "../storage/fatigueStorage";
import { maybeTriggerAlert, resetAlertState } from "../alerts/fatigueAlert";


type PermissionState = "not-determined" | "granted" | "denied";

const BASELINE_UI_DURATION_MS = 3000;
const FACE_LOST_GRACE_MS = 800;

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * ScanScreen is the main screen of the app. It is responsible for
 * handling camera permissions, starting and stopping the camera,

/*******  e84c0190-d7cb-466c-b5ef-ff99ab9044db  *******/
export default function ScanScreen() {
  // ------------------------------------------------
  // Camera + navigation
  // ------------------------------------------------
  const cameraRef = useRef<Camera | null>(null);
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const devices = useCameraDevices();
  const device = devices.find(d => d.position === "front") ?? null;

  // ------------------------------------------------
  // Permission + lifecycle
  // ------------------------------------------------
  const [permission, setPermission] =
    useState<PermissionState>("not-determined");
  const [appState, setAppState] = useState(AppState.currentState);

  const isCameraActive =
    permission === "granted" &&
    isFocused &&
    appState === "active";

  // ------------------------------------------------
  // Session
  // ------------------------------------------------
  const sessionId = useRef(
    `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
  ).current;

  // ------------------------------------------------
  // Fatigue + confidence smoothing
  // ------------------------------------------------
  const [fatigue, setFatigue] = useState<FatigueResult | null>(null);

  const [baselineProgress, setBaselineProgress] = useState(0);
  const baselineStartRef = useRef<number | null>(null);

  const smoothedConfidenceRef = useRef(0);
  const CONFIDENCE_ALPHA = 0.25;

  const smoothConfidence = (raw: number) => {
    smoothedConfidenceRef.current =
      smoothedConfidenceRef.current === 0
        ? raw
        : CONFIDENCE_ALPHA * raw +
          (1 - CONFIDENCE_ALPHA) * smoothedConfidenceRef.current;
    return smoothedConfidenceRef.current;
  };

  const safeConfidence =
    fatigue?.confidence != null
      ? Math.min(1, Math.max(0, smoothConfidence(fatigue.confidence)))
      : 0;

  // ------------------------------------------------
  // Scan state
  // ------------------------------------------------
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isScanningRef = useRef(false);
  const lastFaceSeenTsRef = useRef(0);

  const stopAutoScan = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    isScanningRef.current = false;
  };

  // ------------------------------------------------
  // Permission + lifecycle
  // ------------------------------------------------
  useEffect(() => {
    startSession(sessionId);

    const ensurePermission = async () => {
      const status = await Camera.getCameraPermissionStatus();
      if (status === "granted") {
        setPermission("granted");
      } else {
        const req = await Camera.requestCameraPermission();
        setPermission(req);
      }
    };

    ensurePermission();

    const sub = AppState.addEventListener("change", next => {
      setAppState(next);

      if (next !== "active") {
        stopAutoScan();
        setFatigue(null);
        baselineStartRef.current = null;
        setBaselineProgress(0);
        smoothedConfidenceRef.current = 0;
        lastFaceSeenTsRef.current = 0; // ✅ FIX
        FatigueDetector.resetState();
      }
    });

    return () => {
      sub.remove();
      stopAutoScan();
      endSession(sessionId);
    };
  }, []);

  // ------------------------------------------------
  // Scan interval
  // ------------------------------------------------
  function getScanInterval(level?: FatigueLevel) {
    switch (level) {
      case "HIGH":
        return 800;
      case "MEDIUM":
        return 1200;
      default:
        return 2000;
    }
  }

  // ------------------------------------------------
  // Auto scan loop
  // ------------------------------------------------
  useEffect(() => {
    if (!isCameraActive || !device) {
      stopAutoScan();
      return;
    }

    stopAutoScan();

    scanTimerRef.current = setInterval(() => {
      if (!isCameraActive || isScanningRef.current) return;
      captureAndAnalyze();
    }, getScanInterval(fatigue?.fatigueLevel));

    return stopAutoScan;
  }, [isCameraActive, device, fatigue?.fatigueLevel]);

  // ------------------------------------------------
  // Baseline UI
  // ------------------------------------------------
  useEffect(() => {
    if (!fatigue?.faceDetected) return;

    if (fatigue.isCalibrating) {
      if (!baselineStartRef.current) {
        baselineStartRef.current = Date.now();
      }
      const elapsed = Date.now() - baselineStartRef.current;
      setBaselineProgress(
        Math.min(100, (elapsed / BASELINE_UI_DURATION_MS) * 100)
      );
    } else {
      baselineStartRef.current = null;
      setBaselineProgress(100);
    }
  }, [fatigue?.isCalibrating, fatigue?.faceDetected]);

  // ------------------------------------------------
  // Capture + analyze
  // ------------------------------------------------
  const captureAndAnalyze = async () => {
    if (!cameraRef.current || !isCameraActive || isScanningRef.current) return;

    isScanningRef.current = true;

    try {
      const photo = await cameraRef.current.takePhoto({ flash: "off" });
      if (!photo?.path) return; // ✅ SAFETY

      const result = await FatigueDetector.analyzeFrameFromPath(photo.path);

      if (__DEV__) console.log("FatigueResult:", result);

      if (result?.faceDetected) {
        lastFaceSeenTsRef.current = Date.now();
      }

      
      if (result) {
        setFatigue(result);
        maybeTriggerAlert(result); // 🚨 ALERT CONSUMER
        storeWindowLog({
          sessionId,
          timestamp: Date.now(),
          fatigue: result,
        });
      }

    } catch {
      // ignore background / teardown errors
    } finally {
      isScanningRef.current = false;
    }
  };

  const isFaceLost =
    isCameraActive &&
    !fatigue?.faceDetected &&
    Date.now() - lastFaceSeenTsRef.current > FACE_LOST_GRACE_MS;

  const fatigueStyleMap: Record<FatigueLevel, object> = {
    LOW: styles.low,
    MEDIUM: styles.medium,
    HIGH: styles.high,
  };

  // ------------------------------------------------
  // UI guards
  // ------------------------------------------------
  if (permission === "not-determined") {
    return (
      <View style={styles.center}>
        <Text>Requesting camera permission…</Text>
      </View>
    );
  }

  if (permission === "denied") {
    lastFaceSeenTsRef.current = 0; // ✅ FIX
    return (
      <View style={styles.center}>
        <Text>Camera permission denied</Text>
        <Button title="Open Settings" onPress={Linking.openSettings} />
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text>Loading camera…</Text>
      </View>
    );
  }

  // ------------------------------------------------
  // Render
  // ------------------------------------------------
  return (
    <View style={{ flex: 1 }}>
      {__DEV__ && (
        <Pressable
          style={{ position: "absolute", top: 40, right: 10, zIndex: 999 }}
          onPress={() => navigation.navigate("Debug")}
        >
          <Text style={{ color: "#0f0", fontWeight: "bold" }}>DEBUG</Text>
        </Pressable>
      )}

      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isCameraActive}
        photo
      />

      {isFaceLost && (
        <View style={styles.faceLost}>
          <Text style={styles.text}>
            Face not detected{"\n"}Align your face
          </Text>
        </View>
      )}

      {fatigue?.faceDetected &&
        fatigue.isCalibrating &&
        baselineProgress < 100 && (
          <View style={styles.calib}>
            <Text style={styles.text}>Calibrating baseline…</Text>
            <View style={styles.bar}>
              <View style={[styles.fill, { width: `${baselineProgress}%` }]} />
            </View>
          </View>
        )}

      {fatigue?.faceDetected && !fatigue.isCalibrating && (
        <View style={styles.hud}>
          <Text style={styles.text}>EAR: {fatigue.avgEAR.toFixed(3)}</Text>
          <Text style={styles.text}>
            Blink/min: {fatigue.blinkRate.toFixed(1)}
          </Text>
          <Text style={styles.text}>
            Confidence: {(safeConfidence * 100).toFixed(0)}%
          </Text>
          <Text style={[styles.badge, fatigueStyleMap[fatigue.fatigueLevel]]}>
            {fatigue.fatigueLevel}
          </Text>
        </View>
      )}
    </View>
  );
}

// ------------------------------------------------
// Styles
// ------------------------------------------------
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  hud: {
    position: "absolute",
    top: 40,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    borderRadius: 10,
  },
  calib: {
    position: "absolute",
    bottom: 120,
    width: "80%",
    alignSelf: "center",
  },
  bar: { height: 8, backgroundColor: "#333", borderRadius: 4, marginTop: 6 },
  fill: { height: "100%", backgroundColor: "#4CAF50" },
  faceLost: {
    position: "absolute",
    top: "45%",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    padding: 16,
    borderRadius: 10,
  },
  text: { color: "#fff", textAlign: "center" },
  badge: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    color: "#fff",
    fontWeight: "bold",
  },
  low: { backgroundColor: "#2ecc71" },
  medium: { backgroundColor: "#f39c12" },
  high: { backgroundColor: "#e74c3c" },
});