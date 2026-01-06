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
 * - Inspect what you are ACTUALLY logging
 * - Validate confidence, fatigue stability, baseline success
 * - Catch data poisoning early
 */
export default function FatigueDebugScreen() {
  const [session, setSession] = useState<any | null>(null);
  const [windows, setWindows] = useState<any[]>([]);

  const reload = async () => {
    const s = await getSessionSummaries(); // single object
    const w = await getWindowLogs();       // array
    setSession(s);
    setWindows([...w].reverse());
  };

  useEffect(() => {
    reload();
  }, []);

  // --------------------
  // Data quality metrics
  // --------------------
  const totalWindows = windows.length;

  const noFaceRate =
    totalWindows === 0
      ? 0
      : windows.filter(w => !w.fatigue?.faceDetected).length / totalWindows;

  const lowConfidenceRate =
    totalWindows === 0
      ? 0
      : windows.filter(w => w.fatigue?.confidence < 0.4).length / totalWindows;

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
          No-face rate: {(noFaceRate * 100).toFixed(1)}%
        </Text>
        <Text style={styles.row}>
          Low-confidence windows: {(lowConfidenceRate * 100).toFixed(1)}%
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
          <Text style={styles.row}>Session: {session.sessionId}</Text>
          <Text style={styles.row}>
            Duration: {(session.durationMs / 1000).toFixed(1)}s
          </Text>
          <Text style={styles.row}>
            Avg confidence: {session.avgConfidence.toFixed(2)}
          </Text>
          <Text style={styles.row}>
            Peak fatigue: {session.peakFatigueLevel}
          </Text>
          <Text style={styles.row}>
            Distribution →
            L:{(session.fatigueDistribution.LOW * 100).toFixed(0)}% |
            M:{(session.fatigueDistribution.MEDIUM * 100).toFixed(0)}% |
            H:{(session.fatigueDistribution.HIGH * 100).toFixed(0)}%
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
        const f = w.fatigue;
        if (!f) return null;

        return (
          <View key={i} style={styles.window}>
            <Text style={styles.row}>Session: {w.sessionId}</Text>
            <Text style={styles.row}>Fatigue: {f.fatigueLevel}</Text>
            <Text style={styles.row}>
              Confidence: {f.confidence.toFixed(2)}
            </Text>
            <Text style={styles.row}>
              Blink/min: {f.blinkRate.toFixed(1)}
            </Text>
            <Text style={styles.row}>
              PERCLOS: {f.perclos.toFixed(2)}
            </Text>
            <Text style={styles.row}>
              Time: {new Date(w.timestamp).toLocaleTimeString()}
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