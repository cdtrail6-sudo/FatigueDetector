package com.fatiguedetector.app.mediapipe;

import com.fatiguedetector.app.mediapipe.FatigueResult;
import com.fatiguedetector.app.mediapipe.MediaPipeFaceLandmarker;
import com.fatiguedetector.app.mediapipe.FatigueLevel;
import android.content.Context;
import android.graphics.Bitmap;

import com.google.mediapipe.tasks.components.containers.NormalizedLandmark;
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarkerResult;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

import com.fatiguedetector.app.BuildConfig;

public class MediaPipeFaceAnalyzer {

  // =====================================================
  // STEP 1–6 — THRESHOLDS (TUNED)
  // =====================================================
  private static final double NORM_EAR_HIGH = 0.80;
  private static final double NORM_EAR_LOW  = 0.65;

  private static final double PERCLOS_MED  = 0.15;
  private static final double PERCLOS_HIGH = 0.35;

  private static final int BLINK_MED  = 15;
  private static final int BLINK_HIGH = 25;

  // =====================================================
  // STEP 7.1 / 7.4½ — WINDOW CONFIG
  // =====================================================
  private static final long WINDOW_MS = 20_000;
  private static final int MIN_FRAMES_FOR_PERCLOS = 15;

  // =====================================================
  // BLINK DETECTION (FIXED)
  // =====================================================
  private static final int MIN_CLOSED_FRAMES = 1;
  private static final int MAX_BLINK_FRAMES = 6;
  private static final double BLINK_EAR_RATIO = 0.65;
  private static final int MAX_EAR_FRAMES = 30;

  // =====================================================
  // STEP 7.4 — ANTI-FAKE TEMPORAL
  // =====================================================
  private static final long LOW_EAR_PERSIST_MS = 3000;
  private static final long BLINK_BLOCK_MS = 2000;

  // =====================================================
  // STEP 7.5 — BASELINE CALIBRATION
  // =====================================================
  private static final long BASELINE_WINDOW_MS = 4_000;
  private static final int MIN_BASELINE_FRAMES = 5;
  private static final int MIN_FRAMES_AFTER_BASELINE = 10;

  // =====================================================
  // STEP 7.6 — LIVENESS ENTROPY
  // =====================================================
  private static final int MIN_BLINKS_FOR_ENTROPY = 4;
  private static final double MIN_LIVENESS_ENTROPY = 0.9;

  // =====================================================
  // DEBUG FLAG (TEMPORARY)
  // =====================================================
  private static final boolean DEBUG_7X = BuildConfig.DEBUG; // ⛔ disable before release

  // =====================================================
  // STATE
  // =====================================================
  private int closedFrameCount = 0;
  private long lowEARStartTs = -1;
  private long lastBlinkTs = -1;

  private final Deque<Long> blinkTimestamps = new ArrayDeque<>();
  private final Deque<Boolean> eyeClosedFrames = new ArrayDeque<>();
  private final Deque<Long> frameTimestamps = new ArrayDeque<>();

  private final Deque<Double> baselineEARs = new ArrayDeque<>();
  private long baselineStartTs = -1;
  private Double baselineEAR = null;

  // =====================================================
  // MEDIAPIPE OWNER (INJECTED)
  // =====================================================
  private final MediaPipeFaceLandmarker landmarker;

  // =====================================================
  // Normalized EAR Rolling Window 
  // =====================================================
  private final Deque<Double> normalizedEARFrames = new ArrayDeque<>();
  
  // =====================================================
  // INIT
  // =====================================================
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
    return h == 0 ? 0.0 : (v1 + v2) / (2.0 * h);
  }

  // =====================================================
  // STEP 7.6 — BLINK ENTROPY
  // =====================================================
  private static double computeBlinkEntropy(Deque<Long> ts) {
    if (ts.size() < MIN_BLINKS_FOR_ENTROPY) return 0.0;

    Long[] t = ts.toArray(new Long[0]);
    double[] intervals = new double[t.length - 1];

    for (int i = 1; i < t.length; i++) {
      intervals[i - 1] = t[i] - t[i - 1];
    }

    int buckets = 5;
    int[] counts = new int[buckets];

    double mean = 0;
    for (double v : intervals) mean += v;
    mean /= intervals.length;

    
    for (double v : intervals) {
      double ratio = mean > 0 ? v / mean : 1.0;
      int idx = (int) Math.min(buckets - 1, ratio * 2);
      counts[idx]++;
    }

    double entropy = 0.0;
    for (int c : counts) {
      if (c == 0) continue;
      double p = (double) c / intervals.length;
      entropy -= p * Math.log(p);
    }
    return entropy;
  }

  // =====================================================
  // MAIN ANALYSIS
  // =====================================================
  public FatigueResult analyze(Bitmap bitmap) {
    if (bitmap == null) { 
      return FatigueResult.noFace(System.currentTimeMillis()); 
    }
    FaceLandmarkerResult result = landmarker.processBitmap(bitmap);

     
    long now = System.currentTimeMillis();

    // Face lost → reset temporal trust (baseline + confidence)
    if (result == null || result.faceLandmarks().isEmpty()) {
      resetState();
      return FatigueResult.noFace(now);
    }

    List<NormalizedLandmark> lm = result.faceLandmarks().get(0);

    double leftEAR  = computeEAR(lm, 33, 160, 158, 133, 153, 144);
    double rightEAR = computeEAR(lm, 362, 385, 387, 263, 373, 380);
    double avgEAR   = (leftEAR + rightEAR) / 2.0;

    // ============================
    // STEP 7.5 — BASELINE
    // ============================
    if (baselineEAR == null) {
      if (baselineStartTs < 0) baselineStartTs = now;

      if (avgEAR > 0.12 && avgEAR < 0.45) {
        baselineEARs.addLast(avgEAR);
      }

      if (now - baselineStartTs >= BASELINE_WINDOW_MS &&
          baselineEARs.size() >= MIN_BASELINE_FRAMES) {

        double sum = 0;
        for (double v : baselineEARs) sum += v;
        baselineEAR = sum / baselineEARs.size();
        baselineEARs.clear();
      }

      return FatigueResult.calibrating(leftEAR, rightEAR, avgEAR, now);
    }
    
    double normalizedEAR = baselineEAR > 0 ? avgEAR / baselineEAR : 1.0;

    // ============================
    // STEP 7.4 — SUSTAINED LOW EAR
    // ============================
    boolean sustainedLowEAR = false;
    if (normalizedEAR < NORM_EAR_LOW) {
      if (lowEARStartTs < 0) lowEARStartTs = now;
      else if (now - lowEARStartTs >= LOW_EAR_PERSIST_MS) sustainedLowEAR = true;
    } else {
      lowEARStartTs = -1;
    }

    // ============================
    // BLINK DETECTION (FIXED)
    // ============================
    boolean blinkDetected = false;
    boolean eyeClosed = normalizedEAR < BLINK_EAR_RATIO;

    if (eyeClosed) {
      closedFrameCount++;
      if (closedFrameCount > MAX_BLINK_FRAMES) {
        closedFrameCount = MAX_BLINK_FRAMES + 1;
      }
    } else {
      if (closedFrameCount >= MIN_CLOSED_FRAMES &&
          closedFrameCount <= MAX_BLINK_FRAMES) {
        blinkDetected = true;
        blinkTimestamps.addLast(now);
        lastBlinkTs = now;
      }
      closedFrameCount = 0;
    }

    // ============================
    // STEP 7.4½ — ROLLING WINDOW
    // ============================
    if (normalizedEARFrames.size() >= MAX_EAR_FRAMES) {
        normalizedEARFrames.pollFirst();
      }
    normalizedEARFrames.addLast(normalizedEAR);

    frameTimestamps.addLast(now);
    eyeClosedFrames.addLast(eyeClosed);
    evictOld(now);

    int closed = 0;
    for (Boolean b : eyeClosedFrames) if (b) closed++;

    double perclos = frameTimestamps.size() >= MIN_FRAMES_FOR_PERCLOS
        ? (double) closed / frameTimestamps.size()
        : 0.0;

    double blinkRate = blinkTimestamps.size() * (60_000.0 / WINDOW_MS);
    blinkRate = Math.max(0, Math.min(60, blinkRate)); // cap to avoid extreme values
    boolean recentBlink =
        lastBlinkTs > 0 && (now - lastBlinkTs) < BLINK_BLOCK_MS;

    double earMean = 0.0;
    for (double v : normalizedEARFrames) earMean += v;
    earMean /= Math.max(1, normalizedEARFrames.size());

    double earVariance = 0.0;
    for (double v : normalizedEARFrames) {
      double d = v  - earMean;
      earVariance += d * d;
    }
    earVariance /= Math.max(1, normalizedEARFrames.size());

    boolean unstableSignal = earVariance > 0.015;

    // ============================
    // STEP 7.6 — LIVENESS
    // ============================
    //BlinkTimestamps are already evicted to WINDOW_MS
    double blinkEntropy = computeBlinkEntropy(blinkTimestamps);
    boolean lowLiveness =
      blinkEntropy > 0 &&
      blinkTimestamps.size() >= MIN_BLINKS_FOR_ENTROPY &&
      blinkEntropy < MIN_LIVENESS_ENTROPY;

    // ============================
    // CLASSIFICATION
    // ============================
    FatigueLevel fatigueLevel = FatigueLevel.LOW;

    if (sustainedLowEAR || perclos >= PERCLOS_HIGH || blinkRate > BLINK_HIGH) {
      fatigueLevel = FatigueLevel.HIGH;
    } else if (normalizedEAR < NORM_EAR_HIGH ||
               perclos >= PERCLOS_MED ||
               blinkRate >= BLINK_MED) {
      fatigueLevel = FatigueLevel.MEDIUM;
    }

    if (recentBlink && fatigueLevel == FatigueLevel.HIGH) {
      fatigueLevel = FatigueLevel.MEDIUM;
    }

    if (lowLiveness && fatigueLevel == FatigueLevel.HIGH) {
      fatigueLevel = FatigueLevel.MEDIUM;
    }
    double temporalScore = Math.min(1.0, frameTimestamps.size() / 30.0);
    double stateScore = (fatigueLevel != FatigueLevel.LOW) ? 1.0 : 0.0;
    double stabilityPenalty = unstableSignal ? 0.5 : 1.0;

    double confidence = Math.min(
        1.0,
        (0.5 * temporalScore + 0.5 * stateScore) * stabilityPenalty
    );

    /*double confidence = Math.min(
        1.0,
        0.5 * (frameTimestamps.size() / 30.0) +
        0.5 * ((fatigueLevel != FatigueLevel.LOW ? 1 : 0))
    );*/
    
    if (frameTimestamps.size() < MIN_FRAMES_AFTER_BASELINE) {
      return new FatigueResult(
      true,
      leftEAR,
      rightEAR,
      avgEAR,
      blinkDetected,
      blinkRate,
      DEBUG_7X ? blinkEntropy : -1.0,
      perclos,
      fatigueLevel,
      confidence,
      now
    );
  }

// ✅ FINAL RETURN (steady-state)
return new FatigueResult(
  true,
  leftEAR,
  rightEAR,
  avgEAR,
  blinkDetected,
  blinkRate,
  DEBUG_7X ? blinkEntropy : -1.0,
  perclos,
  fatigueLevel,
  confidence,
  now
  );
}

  private void evictOld(long now) {
    while (!frameTimestamps.isEmpty() &&
          now - frameTimestamps.peekFirst() > WINDOW_MS) {

      frameTimestamps.pollFirst();
      eyeClosedFrames.pollFirst();

      if (!normalizedEARFrames.isEmpty()) {
        normalizedEARFrames.pollFirst();
      }
    }

    while (!blinkTimestamps.isEmpty() &&
          now - blinkTimestamps.peekFirst() > WINDOW_MS) {
      blinkTimestamps.pollFirst();
    }
  }


  public void resetState() {
    closedFrameCount = 0;
    lowEARStartTs = -1;
    lastBlinkTs = -1;

    blinkTimestamps.clear();
    eyeClosedFrames.clear();
    frameTimestamps.clear();
    normalizedEARFrames.clear();

    baselineEARs.clear();
    baselineEAR = null;
    baselineStartTs = -1;
  }
}