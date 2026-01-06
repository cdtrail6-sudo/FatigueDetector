import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Button,
  Linking,
  StyleSheet,
  AppState,
} from "react-native";
import { Camera, useCameraDevices } from "react-native-vision-camera";
import FatigueDetector from "../native/FatigueDetector";
import { Vibration } from "react-native";
import { logFatigueWindow } from "../logging/fatigueLogger";
import { trackFatigue, endSession, startSession } from "../logging/sessionTracker";
import { useNavigation } from "@react-navigation/native";
import { FatigueResult } from "../native/FatigueDetector";

type PermissionState = "not-determined" | "granted" | "denied";

const AUTO_SCAN_INTERVAL_MS = 1200;
const BASELINE_UI_DURATION_MS = 4000;

export default function ScanScreen() {
  // ------------------------------------------------
  // Camera refs
  // ------------------------------------------------
  const cameraRef = useRef<Camera | null>(null);
  const cameraReadyRef = useRef(false);
  const navigation = useNavigation<any>();

  const devices = useCameraDevices();
  const device = React.useMemo(
    () => devices.find(d => d.position === "front") ?? null,
    [devices]
  );
  // ------------------------------------------------
  // Permission + activity
  // ------------------------------------------------
  const [permission, setPermission] =
    useState<PermissionState>("not-determined");
  const [isActive, setIsActive] = useState(false);

  const sessionIdRef = useRef(
  `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );
  const sessionId = sessionIdRef.current;

  const deviceHashRef = useRef(
    `device_${Math.random().toString(36).slice(2)}`
  );
  const deviceHash = deviceHashRef.current;
  // ------------------------------------------------
  // Fatigue + calibration
  // ------------------------------------------------

  const [fatigue, setFatigue] = useState<FatigueResult | null>(null);
  const [baselineProgress, setBaselineProgress] = useState(0);
  const baselineStartRef = useRef<number | null>(null);
  const safeConfidence =
  fatigue?.confidence != null
    ? Math.min(1, Math.max(0, fatigue.confidence))
    : 0;


  // ------------------------------------------------
  // Auto-scan state
  // ------------------------------------------------
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isScanningRef = useRef(false);

  const frameCountRef = useRef(0);
  const startTsRef = useRef<number | null>(null);

  const stopAutoScan = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    isScanningRef.current = false;
  };
  
  // ------------------------------------------------
  // Native fatigue state tracking
  // ------------------------------------------------
  const DEBUG_7X = __DEV__; // ⛔ flip to const DEBUG_7X = __DEV__; for prod and

  //Alert parameters
  const ALERT_CONFIDENCE_THRESHOLD = 0.7;
  const ALERT_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes

  // ------------------------------------------------
  // Permission + lifecycle
  // ------------------------------------------------
  useEffect(() => {
    startSession(sessionId);
    baselineStartRef.current = null;
    setBaselineProgress(0);

    let mounted = true;

    const ensurePermission = async () => {
      const status = await Camera.getCameraPermissionStatus();
      if (!mounted) return;

      if (status === "granted") {
        setPermission("granted");
        setIsActive(true);
        return;
      }

      if (status === "denied") {
        setPermission("denied");
        setIsActive(false);
        return;
      }

      const result = await Camera.requestCameraPermission();
      if (!mounted) return;

      setPermission(result);
      setIsActive(result === "granted");
    };

    ensurePermission();

    const sub = AppState.addEventListener("change", state => {
      if (state === "active") {
        baselineStartRef.current = null;
        setBaselineProgress(0);
        ensurePermission();
        return;
      }

      // -------------------------------
      // App is backgrounded / locked
      // -------------------------------
      setIsActive(false);
      stopAutoScan();

      // ⛔️ Baseline MUST reset (7.5)
      baselineStartRef.current = null;
      setBaselineProgress(0);      

      // ⛔️ Confidence & fatigue invalid once continuity breaks
      setFatigue(null);
      frameCountRef.current = 0;
      startTsRef.current = null;
      FatigueDetector.resetState();
      
    });


    return () => {
      mounted = false;
      sub.remove();
      stopAutoScan();
      endSession(sessionId);
    };
  }, []);

  // ------------------------------------------------
  // Auto-scan loop
  // ------------------------------------------------
  
  // Dynamic scan interval - BATTERY-AWARE SCANNING
  function getScanInterval(fatigueLevel?: string) {
    switch (fatigueLevel) {
      case "HIGH": return 800;
      case "MEDIUM": return 1200;
      default: return 2000;
    }
  }

  useEffect(() => {
    if (permission !== "granted" || !isActive || !device) {
      stopAutoScan();
      return;
    }

    stopAutoScan(); // ⛔ reset interval when fatigue level changes

    scanTimerRef.current = setInterval(() => {
      if (!isScanningRef.current) {
        captureAndAnalyze();
      }
    }, getScanInterval(fatigue?.fatigueLevel));

    return stopAutoScan;
  }, [permission, isActive, device, fatigue?.fatigueLevel]);
  
  // ------------------------------------------------
  // Baseline UI progress (FIXED – 7.5 correct)
  // ------------------------------------------------

  useEffect(() => {
    if (!fatigue?.faceDetected) return;

    // -----------------------------
    // During calibration
    // -----------------------------
    if (fatigue.isCalibrating) {
      if (!baselineStartRef.current) {
        baselineStartRef.current = Date.now();
      }

      const elapsed = Date.now() - baselineStartRef.current;
      setBaselineProgress(
        Math.min(100, (elapsed / BASELINE_UI_DURATION_MS) * 100)
      );
      return;
    }

    // -----------------------------
    // Calibration finished (native decides)
    // -----------------------------
    baselineStartRef.current = null;
    setBaselineProgress(100);

  }, [fatigue?.isCalibrating, fatigue?.faceDetected]);
  
  // ------------------------------------------------
  // Fatigue logging
  // ------------------------------------------------ 
  useEffect(() => {
    if (
      !fatigue?.faceDetected ||
      fatigue.isCalibrating ||
      fatigue.confidence < 0.4
    ) return;

    logFatigueWindow({
      sessionId,
      deviceHash,
      fatigue,
      windowDurationMs: 20_000,
      scanIntervalMs: AUTO_SCAN_INTERVAL_MS,
      faceDetectedRatio: 1.0,
    });

    trackFatigue({
      fatigueLevel: fatigue.fatigueLevel,
      confidence: safeConfidence,
    });

  }, [fatigue]);

  // ------------------------------------------------
  // High fatigue alerting
  // ------------------------------------------------
  const lastAlertRef = useRef<number>(0);

  useEffect(() => {
    if (!fatigue?.faceDetected) return;

    if (
      fatigue.fatigueLevel === "HIGH" &&
      fatigue.confidence >= ALERT_CONFIDENCE_THRESHOLD &&
      Date.now() - lastAlertRef.current > ALERT_COOLDOWN_MS
    ) {
      Vibration.vibrate(500);
      lastAlertRef.current = Date.now();
    }
  }, [fatigue]);

  // ------------------------------------------------
  // Effective FPS calculation - FPS calculation should ignore calibration frames
  // ------------------------------------------------
  const effectiveFps =
    baselineProgress === 100 && startTsRef.current
      ? frameCountRef.current / ((Date.now() - startTsRef.current) / 1000)
      : 0;

  // ------------------------------------------------
  // Capture + analyze
  // ------------------------------------------------
  const captureAndAnalyze = async () => {
    if (
      !cameraRef.current ||
      !cameraReadyRef.current ||
      isScanningRef.current ||
      !isActive ||
      permission !== "granted"
    ) {
      return;
    }

    isScanningRef.current = true;

    try {
      const photo = await cameraRef.current.takePhoto({ flash: "off" });

      const result = await FatigueDetector.analyzeFrameFromPath(
        photo.path
      );

      if (result?.faceDetected) {
        frameCountRef.current += 1;
        if (!startTsRef.current) {
          startTsRef.current = Date.now();
        }
      }

      setFatigue(result);
    } catch (e) {
      console.warn("Fatigue analyze failed", e);
    } finally {
      isScanningRef.current = false;
    }

      
  };

  // ------------------------------------------------
  // UI states
  // ------------------------------------------------
  
  if (permission === "not-determined") {
    return (
      <View style={styles.center}>
        <Text>Requesting camera permission…</Text>
      </View>
    );
  }

  if (permission === "denied") {
    return (
      <View style={styles.center}>
        <Text>Camera permission denied</Text>
        <Button
          title="Open Settings"
          onPress={Linking.openSettings}
        />
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
  // Camera + overlays
  // ------------------------------------------------
  return (
    <View style={{ flex: 1 }}>
      {__DEV__ && (
          <Text
            style={{ color: "#0f0", position: "absolute", top: 40, right: 10 }}
            onLongPress={() => navigation.navigate("Debug")}
          >
            DEBUG
          </Text>
        )}
      <Camera
        ref={cameraRef as any}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive && permission === "granted"}
        photo
        onStarted={() => {
          cameraReadyRef.current = true;
        }}
        onStopped={() => {
          cameraReadyRef.current = false;
        }}
      />
      
      {baselineProgress < 100 && (
        <View style={styles.calib}>
          <Text style={styles.text}>
            Calibrating baseline…
            “The app needs a few seconds to calibrate your normal eye behavior.
            Confidence increases as more valid data is collected.”
          </Text>
          <View style={styles.bar}>
            <View
              style={[
                styles.fill,
                { width: `${baselineProgress}%` },
              ]}
            />
          </View>
        </View>
      )}

      {fatigue?.faceDetected &&
        baselineProgress === 100 && (
          <View style={styles.hud}>
            <Text style={styles.text}>
              EAR: {baselineProgress === 100
                ? fatigue.avgEAR?.toFixed?.(3)
                : "--"}
            </Text>
            <Text style={styles.text}>
              Blink/min: {fatigue.blinkRate?.toFixed(1) ?? "--"}
            </Text>
            <View style={{
              position: "absolute",
              top: 10,
              right: 10,
              backgroundColor: "rgba(0,0,0,0.7)",
              padding: 8,
              borderRadius: 6,
            }}>
              <Text style={styles.text}>
                Frames: {frameCountRef.current}
              </Text>
              <Text style={styles.text}>
                FPS: {effectiveFps.toFixed(2)}
              </Text>
              <Text style={styles.text}>
                Fatigue: {fatigue.fatigueLevel}
              </Text>
              <Text style={styles.text}>
                Confidence: {(safeConfidence * 100).toFixed(0)}%
              </Text>
            </View>
            <Text
              style={[
                styles.badge,
                fatigue.fatigueLevel === "LOW" && styles.low,
                fatigue.fatigueLevel === "MEDIUM" &&
                  styles.medium,
                fatigue.fatigueLevel === "HIGH" &&
                  styles.high,
              ]}
            >
              {fatigue.fatigueLevel}
            </Text>
          </View>
          
        )}
        

        {DEBUG_7X && fatigue?.faceDetected && (
          <View style={styles.debug}>
            <Text style={styles.debugText}>
              Entropy: {fatigue.blinkEntropy?.toFixed?.(2) ?? "—"}
            </Text>

            <Text style={styles.debugText}>
              Blink/min: {fatigue.blinkRate.toFixed(1)}
            </Text>

            <Text style={styles.debugText}>
              Confidence: {fatigue.confidence.toFixed(2)}
            </Text>

            <Text style={styles.debugText}>
              State: {fatigue.fatigueLevel}
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  hud: {
    position: "absolute",
    top: 40,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    borderRadius: 10,
  },
  debug: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    padding: 10,
    borderRadius: 8,
  },

  debugText: {
    color: "#0f0",
    fontSize: 12,
    textAlign: "center",
  },
  calib: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    width: "80%",
  },
  bar: {
    height: 8,
    backgroundColor: "#333",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 6,
  },
  fill: {
    height: "100%",
    backgroundColor: "#4CAF50",
  },
  text: {
    color: "#fff",
    textAlign: "center",
  },
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