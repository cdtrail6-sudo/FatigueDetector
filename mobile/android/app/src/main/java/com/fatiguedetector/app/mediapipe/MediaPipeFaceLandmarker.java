package com.fatiguedetector.app.mediapipe;

import android.content.Context;
import android.graphics.Bitmap;

import com.google.mediapipe.framework.image.BitmapImageBuilder;
import com.google.mediapipe.framework.image.MPImage;
import com.google.mediapipe.tasks.core.BaseOptions;
import com.google.mediapipe.tasks.vision.core.RunningMode;
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker;
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarkerResult;

public class MediaPipeFaceLandmarker {

  private final FaceLandmarker faceLandmarker;

  public MediaPipeFaceLandmarker(Context context) {
    BaseOptions baseOptions =
        BaseOptions.builder()
            .setModelAssetPath("face_landmarker.task")
            .build();

    FaceLandmarker.FaceLandmarkerOptions options =
        FaceLandmarker.FaceLandmarkerOptions.builder()
            .setBaseOptions(baseOptions)
            .setRunningMode(RunningMode.IMAGE)
            .setNumFaces(1)
            .build();

    faceLandmarker = FaceLandmarker.createFromOptions(context, options);
  }

  /** ✅ JAVA-CONTRACT METHOD */
  public FaceLandmarkerResult processBitmap(Bitmap bitmap) {
    if (bitmap == null) return null;

    MPImage mpImage = new BitmapImageBuilder(bitmap).build();
    return faceLandmarker.detect(mpImage);
  }
}
