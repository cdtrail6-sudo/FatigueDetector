
package com.fatiguedetector.app.bridge;
import com.fatiguedetector.app.mediapipe.MediaPipeFaceAnalyzer;
import com.fatiguedetector.app.mediapipe.FatigueResult;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.io.File;

public class FatigueDetectorModule extends ReactContextBaseJavaModule {

  private final MediaPipeFaceAnalyzer analyzer;

  public FatigueDetectorModule(ReactApplicationContext reactContext) {
    super(reactContext);
    analyzer = new MediaPipeFaceAnalyzer(reactContext);
  }

  @Override
  public String getName() {
    return "FatigueDetector";
  }

  @ReactMethod
  public void resetState() {
    analyzer.resetState();
  }

  @ReactMethod
  public void analyzeFrame(String base64Image, Promise promise) {
    try {
      byte[] bytes = Base64.decode(base64Image, Base64.DEFAULT);
      Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);

      if (bitmap == null) {
        promise.reject("DECODE_ERROR", "Failed to decode bitmap");
        return;
      }

      FatigueResult r = analyzer.analyze(bitmap);

      if (r == null) {
        if (!bitmap.isRecycled()) {
          bitmap.recycle();
        }
        WritableMap res = Arguments.createMap();
        res.putBoolean("faceDetected", false);
        res.putDouble("timestamp", System.currentTimeMillis());
        promise.resolve(res);
        return;
      }

      WritableMap result = Arguments.createMap();
      result.putBoolean("faceDetected", r.faceDetected);
      result.putBoolean("isCalibrating", r.isCalibrating);
      result.putDouble("leftEAR", r.leftEAR);
      result.putDouble("rightEAR", r.rightEAR);
      result.putDouble("avgEAR", r.avgEAR);
      result.putBoolean("blinkDetected", r.blinkDetected);
      result.putDouble("blinkRate", r.blinkRate);
      result.putDouble("blinkEntropy", r.blinkEntropy);
      result.putDouble("perclos", r.perclos);
      result.putString("fatigueLevel", r.fatigueLevel.name());
      result.putDouble("confidence", r.confidence);
      result.putDouble("timestamp", r.timestamp);

        if (!bitmap.isRecycled()) {
          bitmap.recycle();
        }
      promise.resolve(result);

    } catch (Exception e) {
      promise.reject("ANALYZE_BASE64_ERROR", e.getMessage(), e);
    }
  }
  @ReactMethod
  public void analyzeFrameFromPath(String path, Promise promise) {
    try {
      File file = new File(path);

      if (!file.exists()) {
        promise.reject("FILE_NOT_FOUND", "Image file not found: " + path);
        return;
      }

      Bitmap bitmap = BitmapFactory.decodeFile(path);

      if (bitmap == null) {
        promise.reject("DECODE_ERROR", "Failed to decode bitmap from path");
        return;
      }

      FatigueResult r = analyzer.analyze(bitmap);

      if (r == null) {
        if (!bitmap.isRecycled()) {
          bitmap.recycle();
        }
        WritableMap res = Arguments.createMap();
        res.putBoolean("faceDetected", false);
        res.putDouble("timestamp", System.currentTimeMillis());
        promise.resolve(res);
        return;
      }

      WritableMap result = Arguments.createMap();
      result.putBoolean("faceDetected", r.faceDetected);
      result.putBoolean("isCalibrating", r.isCalibrating);
      result.putDouble("leftEAR", r.leftEAR);
      result.putDouble("rightEAR", r.rightEAR);
      result.putDouble("avgEAR", r.avgEAR);
      result.putBoolean("blinkDetected", r.blinkDetected);
      result.putDouble("blinkRate", r.blinkRate);
      result.putDouble("blinkEntropy", r.blinkEntropy);
      result.putDouble("perclos", r.perclos);
      result.putString("fatigueLevel", r.fatigueLevel.name());
      result.putDouble("confidence", r.confidence);
      result.putDouble("timestamp", r.timestamp);
        if (!bitmap.isRecycled()) {
          bitmap.recycle();
        }
      promise.resolve(result);

    } catch (Exception e) {
      promise.reject("ANALYZE_PATH_ERROR", e.getMessage(), e);
    }
  }

}