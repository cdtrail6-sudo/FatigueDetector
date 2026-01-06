package com.fatiguedetector.app.mediapipe;

public class FatigueResult {

  // Detection
  public boolean faceDetected;
  public boolean isCalibrating;

  // Eye metrics
  public double leftEAR;
  public double rightEAR;
  public double avgEAR;

  // Blink metrics
  public boolean blinkDetected;
  public double blinkRate;
  public double blinkEntropy;

  // Fatigue metrics
  public double perclos;

  // Classification
  public FatigueLevel fatigueLevel;

  // Trust
  public double confidence;

  // Timestamp
  public long timestamp;

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
    FatigueLevel fatigueLevel,
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

  // ---------------------------------------------
  // FACTORY: No face detected
  // ---------------------------------------------
  public static FatigueResult noFace(long ts) {
    return new FatigueResult(
      false,        // faceDetected
      false,        // isCalibrating
      0, 0, 0,      // EARs
      false,        // blinkDetected
      0,            // blinkRate
      -1,           // blinkEntropy (invalid)
      0,            // perclos
      FatigueLevel.LOW,
      0,            // confidence
      ts
    );
  }

  // ---------------------------------------------
  // FACTORY: Baseline calibration
  // ---------------------------------------------
  public static FatigueResult calibrating(
    double left,
    double right,
    double avg,
    long ts
  ) {
    return new FatigueResult(
      true,         // faceDetected
      true,         // isCalibrating
      left,
      right,
      avg,
      false,        // blinkDetected
      0,            // blinkRate
      -1,           // blinkEntropy
      0,            // perclos
      FatigueLevel.LOW,
      0,            // confidence
      ts
    );
  }
}