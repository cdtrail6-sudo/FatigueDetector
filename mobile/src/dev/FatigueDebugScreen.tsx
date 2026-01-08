import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Button,
} from "react-native";
import {
  getSessionSummaries,
  getWindowLogs,
  clearLogs,
} from "../storage/fatigueStorage";


/**
 * DEV-ONLY SCREEN
 * Purpose:
 * - Inspect real logged data
 * - Catch baseline + confidence issues safely
 */
export default function FatigueDebugScreen() {
  const [session, setSession] = useState<any | null>(null);
  const [windows, setWindows] = useState<any[]>([]);

  const reload = async () => {
    try {
      const s = await getSessionSummaries();
      const w = await getWindowLogs();
      setSession(s ?? null);
      setWindows(Array.isArray(w) ? [...w].reverse() : []);
    } catch (e) {
      console.warn("Debug reload failed", e);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  // --------------------
  // Data quality metrics (SAFE)
  // --------------------
  const totalWindows = windows.length;

  const noFaceRate =
    totalWindows === 0
      ? 0
      : windows.filter(w => w?.fatigue?.faceDetected === false).length /
        totalWindows;

  const lowConfidenceRate =
    totalWindows === 0
      ? 0
      : windows.filter(
          w => typeof w?.fatigue?.confidence === "number" &&
               w.fatigue.confidence < 0.4
        ).length / totalWindows;

  // --------------------
  // Helpers
  // --------------------
  const fmtPct = (v?: number, digits = 1) =>
    typeof v === "number" && !isNaN(v) ? (v * 100).toFixed(digits) : "–";

  const fmtNum = (v?: number, digits = 2) =>
    typeof v === "number" && !isNaN(v) ? v.toFixed(digits) : "–";

  // --------------------
  // Render
  // --------------------
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧪 Fatigue Debug Console</Text>

      <View style={styles.actions}>
        <Button title="Reload Logs" onPress={reload} />
        <Button title="Clear Logs" color="#c0392b" onPress={clearLogs} />
      </View>

      {/* -------------------- */}
      {/* DATA QUALITY */}
      {/* -------------------- */}
      <Text style={styles.section}>Data Quality</Text>
      <View style={styles.card}>
        <Text style={styles.row}>
          No-face rate: {fmtPct(noFaceRate)}%
        </Text>
        <Text style={styles.row}>
          Low-confidence windows: {fmtPct(lowConfidenceRate)}%
        </Text>
        <Text style={styles.row}>
          Total windows: {totalWindows}
        </Text>
      </View>

      {/* -------------------- */}
      {/* SESSION SUMMARY */}
      {/* -------------------- */}
      <Text style={styles.section}>📦 Session</Text>

      {!session && (
        <Text style={styles.empty}>No session logged</Text>
      )}

      {session && (
        <View style={styles.card}>
          <Text style={styles.row}>
            Session: {session.sessionId ?? "–"}
          </Text>
          <Text style={styles.row}>
            Duration: {fmtNum(session.durationMs / 1000, 1)}s
          </Text>
          <Text style={styles.row}>
            Avg confidence: {fmtNum(session.avgConfidence)}
          </Text>
          <Text style={styles.row}>
            Peak fatigue: {session.peakFatigueLevel ?? "–"}
          </Text>
          <Text style={styles.row}>
            Distribution →
            L:{fmtPct(session?.fatigueDistribution?.LOW, 0)}% |
            M:{fmtPct(session?.fatigueDistribution?.MEDIUM, 0)}% |
            H:{fmtPct(session?.fatigueDistribution?.HIGH, 0)}%
          </Text>
          <Text style={styles.row}>
            Baseline: {session.baselineSuccessful ? "✅ OK" : "❌ FAILED"}
          </Text>
        </View>
      )}

      {/* -------------------- */}
      {/* WINDOW LOGS */}
      {/* -------------------- */}
      <Text style={styles.section}>🪟 Windows (last 20)</Text>

      {windows.slice(0, 20).map((w, i) => {
        const f = w?.fatigue;
        if (!f) return null;

        return (
          <View key={i} style={styles.window}>
            <Text style={styles.row}>Session: {w.sessionId ?? "–"}</Text>
            <Text style={styles.row}>Fatigue: {f.fatigueLevel ?? "–"}</Text>
            <Text style={styles.row}>
              Confidence: {fmtNum(f.confidence)}
            </Text>
            <Text style={styles.row}>
              Blink/min: {fmtNum(f.blinkRate, 1)}
            </Text>
            <Text style={styles.row}>
              PERCLOS: {fmtNum(f.perclos)}
            </Text>
            <Text style={styles.row}>
              Time: {w.timestamp
                ? new Date(w.timestamp).toLocaleTimeString()
                : "–"}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

// --------------------
// Styles
// --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: "#0e0e0e",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  section: {
    color: "#f1c40f",
    fontSize: 16,
    marginTop: 20,
    marginBottom: 6,
  },
  empty: {
    color: "#888",
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#1e1e1e",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  window: {
    backgroundColor: "#151515",
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  row: {
    color: "#ecf0f1",
    fontSize: 13,
  },
});