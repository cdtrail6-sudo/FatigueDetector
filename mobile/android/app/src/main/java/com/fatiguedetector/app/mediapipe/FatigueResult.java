package com.fatiguedetector.app.mediapipe;

import androidx.annotation.NonNull;

/**
 * Immutable fatigue analysis result.
 * MUST stay in sync with FatigueDetector.ts FatigueResult type.
 */
public final class FatigueResult {

  // -------------------------------------------------
  // Core flags
  // -------------------------------------------------
  public final boolean faceDetected;
  public final boolean isCalibrating;

  // -------------------------------------------------
  // Eye metrics
  // -------------------------------------------------
  public final double leftEAR;
  public final double rightEAR;
  public final double avgEAR;

  // -------------------------------------------------
  // Blink metrics
  // -------------------------------------------------
  public final boolean blinkDetected;
  public final double blinkRate;
  public final double blinkEntropy;

  // -------------------------------------------------
  // Fatigue metrics
  // -------------------------------------------------
  public final double perclos;
  public final FatigueLevel fatigueLevel;
  public final double confidence;

  // -------------------------------------------------
  // Timestamp
  // -------------------------------------------------
  public final long timestamp;

  // -------------------------------------------------
  // Constructor
  // -------------------------------------------------
  public FatigueResult(
      boolean faceDetected,
      boolean isCalibrating,
      double leftEAR,
      double rightEAR,
      double avgEAR,
      boolean blinkDetected,
      double blinkRate,
      double blinkEntropy,
      double perclos,
      @NonNull FatigueLevel fatigueLevel,
      double confidence,
      long timestamp
  ) {
    this.faceDetected = faceDetected;
    this.isCalibrating = isCalibrating;
    this.leftEAR = leftEAR;
    this.rightEAR = rightEAR;
    this.avgEAR = avgEAR;
    this.blinkDetected = blinkDetected;
    this.blinkRate = blinkRate;
    this.blinkEntropy = blinkEntropy;
    this.perclos = perclos;
    this.fatigueLevel = fatigueLevel;
    this.confidence = confidence;
    this.timestamp = timestamp;
  }

  // -------------------------------------------------
  // Factory helpers
  // -------------------------------------------------

  /** Returned when no face is detected */
  public static FatigueResult noFace(long timestamp) {
    return new FatigueResult(
        false,
        false,
        0.0,
        0.0,
        0.0,
        false,
        0.0,
        -1.0,
        0.0,
        FatigueLevel.LOW,
        0.0,
        timestamp
    );
  }

  /**
 * HOLD = temporary landmark loss within grace window.
 * Face is still considered present.
 * Confidence must NOT increase during HOLD.
 */
  public static FatigueResult hold(long ts) {
    return new FatigueResult(
        true,     // faceDetected (or true, your choice)
        false,     // isCalibrating
        0.0,
        0.0,
        0.0,
        false,
        0.0,
        -1.0,
        0.0,
        FatigueLevel.LOW,
        0.0,
        ts
    );
  }


  /** Returned during baseline calibration */
  public static FatigueResult calibrating(
      double leftEAR,
      double rightEAR,
      double avgEAR,
      long timestamp
  ) {
    return new FatigueResult(
        true,
        true,
        leftEAR,
        rightEAR,
        avgEAR,
        false,
        0.0,
        -1.0,
        0.0,
        FatigueLevel.LOW,
        0.0,
        timestamp
    );
  }
}