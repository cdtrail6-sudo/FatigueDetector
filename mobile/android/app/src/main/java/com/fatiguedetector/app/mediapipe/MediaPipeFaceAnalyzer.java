package com.fatiguedetector.app.mediapipe;

import android.content.Context;
import android.graphics.Bitmap;

import com.fatiguedetector.app.BuildConfig;
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark;
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarkerResult;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

public class MediaPipeFaceAnalyzer {

  // =====================================================
  // THRESHOLDS
  // =====================================================
  private static final double NORM_EAR_HIGH = 0.80;
  private static final double NORM_EAR_LOW  = 0.65;

  private static final double PERCLOS_MED  = 0.15;
  private static final double PERCLOS_HIGH = 0.35;

  private static final int BLINK_MED  = 15;
  private static final int BLINK_HIGH = 25;

  private static final long FACE_LOST_GRACE_MS = 1000;

  // =====================================================
  // WINDOWS
  // =====================================================
  private static final long WINDOW_MS = 20_000;
  private static final int MIN_FRAMES_FOR_PERCLOS = 15;

  // =====================================================
  // BLINK
  // =====================================================
  private static final int MIN_CLOSED_FRAMES = 1;
  private static final int MAX_BLINK_FRAMES = 6;
  private static final double BLINK_EAR_RATIO = 0.65;

  // =====================================================
  // BASELINE
  // =====================================================
  private static final long BASELINE_WINDOW_MS = 3_000;
  private static final int MIN_BASELINE_FRAMES = 8;
  private static final int MIN_FRAMES_AFTER_BASELINE = 5;

  // =====================================================
  // DEBUG
  // =====================================================
  private static final boolean DEBUG_7X = BuildConfig.DEBUG;

  // =====================================================
  // STATE
  // =====================================================
  private int closedFrameCount = 0;
  private long lastBlinkTs = -1;
  private int framesAfterBaseline = 0;
  private long lastFaceSeenTs = -1;

  private final Deque<Long> blinkTimestamps = new ArrayDeque<>();
  private final Deque<Boolean> eyeClosedFrames = new ArrayDeque<>();
  private final Deque<Long> frameTimestamps = new ArrayDeque<>();
  private final Deque<Double> earHistory = new ArrayDeque<>();  
  private final Deque<Double> baselineEARs = new ArrayDeque<>();
  private long baselineStartTs = -1;
  private Double baselineEAR = null;

  // =====================================================
  // MEDIAPIPE
  // =====================================================
  private final MediaPipeFaceLandmarker landmarker;

  public MediaPipeFaceAnalyzer(Context context) {
    landmarker = new MediaPipeFaceLandmarker(context);
  }

  // =====================================================
  // UTILS
  // =====================================================
  private static double dist(NormalizedLandmark a, NormalizedLandmark b) {
    double dx = a.x() - b.x();
    double dy = a.y() - b.y();
    return Math.sqrt(dx * dx + dy * dy);
  }

  private static double computeEAR(
      List<NormalizedLandmark> lm,
      int p1, int p2, int p3, int p4, int p5, int p6
  ) {
    double v1 = dist(lm.get(p2), lm.get(p6));
    double v2 = dist(lm.get(p3), lm.get(p5));
    double h  = dist(lm.get(p1), lm.get(p4));
    return h <= 0 ? 0.0 : (v1 + v2) / (2.0 * h);
  }

  private static double computeBlinkEntropy(Deque<Long> ts) {
    if (ts.size() < 4) return 0.0;
    Long[] t = ts.toArray(new Long[0]);
    double sum = 0;
    for (int i = 1; i < t.length; i++) {
      sum += Math.log(t[i] - t[i - 1] + 1);
    }
    return sum / (t.length - 1);
  }

  // =====================================================
  // MAIN ANALYSIS
  // =====================================================
  public FatigueResult analyze(Bitmap bitmap) {
    long now = System.currentTimeMillis();

    if (bitmap == null) {
      return FatigueResult.noFace(now);
    }

    FaceLandmarkerResult result = landmarker.processBitmap(bitmap);

    if (result == null || result.faceLandmarks().isEmpty()) {
      if (lastFaceSeenTs > 0 &&
          now - lastFaceSeenTs < FACE_LOST_GRACE_MS) {
        return FatigueResult.hold(now);
      }
      return FatigueResult.noFace(now);
    }

    lastFaceSeenTs = now;

    List<NormalizedLandmark> lm = result.faceLandmarks().get(0);

    double leftEAR  = computeEAR(lm, 33, 160, 158, 133, 153, 144);
    double rightEAR = computeEAR(lm, 362, 385, 387, 263, 373, 380);
    double avgEAR   = (leftEAR + rightEAR) / 2.0;

    // =====================================================
    // BASELINE
    // =====================================================
    if (baselineEAR == null) {
      if (baselineStartTs < 0) baselineStartTs = now;

      if (avgEAR > 0.15 && avgEAR < 0.35) {
        baselineEARs.addLast(avgEAR);
      }

      if (now - baselineStartTs >= BASELINE_WINDOW_MS &&
          baselineEARs.size() >= MIN_BASELINE_FRAMES) {

        double sum = 0;
        for (double v : baselineEARs) sum += v;
        baselineEAR = Math.max(0.18, sum / baselineEARs.size());

        baselineEARs.clear();
        framesAfterBaseline = 0;

        if (DEBUG_7X) {
          android.util.Log.d("Fatigue", "Baseline locked: " + baselineEAR);
        }
      }

      return FatigueResult.calibrating(leftEAR, rightEAR, avgEAR, now);
    }

    // =====================================================
    // POST-BASELINE
    // =====================================================
    framesAfterBaseline++;

    double normalizedEAR = avgEAR / baselineEAR;
    normalizedEAR = Math.max(0.3, Math.min(1.3, normalizedEAR));
    if (framesAfterBaseline >= MIN_FRAMES_AFTER_BASELINE) {
      earHistory.addLast(normalizedEAR);
    }
    boolean eyeClosed = normalizedEAR < BLINK_EAR_RATIO;
    boolean blinkDetected = false;

    if (eyeClosed) {
      closedFrameCount++;
    } else {
      if (closedFrameCount >= MIN_CLOSED_FRAMES &&
          closedFrameCount <= MAX_BLINK_FRAMES) {
        blinkDetected = true;
        blinkTimestamps.addLast(now);
        lastBlinkTs = now;
      }
      closedFrameCount = 0;
    }

    frameTimestamps.addLast(now);
    eyeClosedFrames.addLast(eyeClosed);
    evictOld(now);

    int closed = 0;
    for (boolean b : eyeClosedFrames) if (b) closed++;

    double perclos =
        frameTimestamps.size() >= MIN_FRAMES_FOR_PERCLOS
            ? (double) closed / frameTimestamps.size()
            : 0.0;

    long windowStart = frameTimestamps.peekFirst();
    double effectiveWindowMs =
        Math.max(1, Math.min(WINDOW_MS, now - windowStart));

    double blinkRate =
        blinkTimestamps.size() * (60_000.0 / effectiveWindowMs);
    double earVariance = computeVariance(earHistory);

    /**
     * Expected behavior:
     * - Stable EAR variance ≈ 0.002–0.006
     * - Erratic / jittery ≥ 0.015
     */
    double stabilityScore;

    if (earHistory.size() < 8) {
      stabilityScore = 1.0;
    } else if (earVariance <= 0.006) {
      stabilityScore = 1.0;
    } else if (earVariance >= 0.02) {
      stabilityScore = 0.4; // hard distrust
    } else {
      // smooth linear falloff
      stabilityScore =
          1.0 - ((earVariance - 0.006) / (0.02 - 0.006)) * 0.6;
    }

    // =====================================================
    // CLASSIFICATION
    // =====================================================
    FatigueLevel fatigueLevel = FatigueLevel.LOW;

    if (normalizedEAR < NORM_EAR_LOW ||
        perclos >= PERCLOS_HIGH ||
        blinkRate > BLINK_HIGH) {
      fatigueLevel = FatigueLevel.HIGH;
    } else if (normalizedEAR < NORM_EAR_HIGH ||
               perclos >= PERCLOS_MED ||
               blinkRate >= BLINK_MED) {
      fatigueLevel = FatigueLevel.MEDIUM;
    }

    // =====================================================
    // CONFIDENCE
    // =====================================================
    double confidence;

    boolean isCalibrating =
        framesAfterBaseline < MIN_FRAMES_AFTER_BASELINE;

    if (isCalibrating) {
      confidence = 0.0;
    } else {
      double temporalScore = Math.min(1.0, framesAfterBaseline / 30.0);
      double stateScore = fatigueLevel == FatigueLevel.LOW ? 0.5 : 1.0;
      double rawConfidence =
        0.5 * temporalScore + 0.5 * stateScore;

      confidence = Math.min(1.0, rawConfidence * stabilityScore);
    }

    return new FatigueResult(
        true,
        isCalibrating,
        leftEAR,
        rightEAR,
        avgEAR,
        blinkDetected,
        blinkRate,
        DEBUG_7X ? computeBlinkEntropy(blinkTimestamps) : -1.0,
        perclos,
        fatigueLevel,
        confidence,
        now
    );
  }

  // =====================================================
  // EVICTION
  // =====================================================
  private void evictOld(long now) {
    while (!frameTimestamps.isEmpty() &&
           now - frameTimestamps.peekFirst() > WINDOW_MS) {
      frameTimestamps.pollFirst();
      eyeClosedFrames.pollFirst();
      earHistory.pollFirst();
    }

    while (!blinkTimestamps.isEmpty() &&
           now - blinkTimestamps.peekFirst() > WINDOW_MS) {
      blinkTimestamps.pollFirst();
    }
  }

  private static double computeVariance(Deque<Double> values) {
    if (values.size() < 5) return 0.0;

    double mean = 0;
    for (double v : values) mean += v;
    mean /= values.size();

    double var = 0;
    for (double v : values) {
      double d = v - mean;
      var += d * d;
    }
    return var / values.size();
  }

  // =====================================================
  // RESET
  // =====================================================
  public void resetState() {
    closedFrameCount = 0;
    lastBlinkTs = -1;
    framesAfterBaseline = 0;
    lastFaceSeenTs = -1;

    blinkTimestamps.clear();
    eyeClosedFrames.clear();
    frameTimestamps.clear();
    earHistory.clear();              

    baselineEARs.clear();
    baselineEAR = null;
    baselineStartTs = -1;
  }
}