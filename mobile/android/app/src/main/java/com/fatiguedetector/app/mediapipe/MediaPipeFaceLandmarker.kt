package com.fatiguedetector.app.mediapipe

import android.content.Context
import android.graphics.Bitmap
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.vision.facelandmarker.*
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.core.BaseOptions

class MediaPipeFaceLandmarker(context: Context) {

    private val faceLandmarker: FaceLandmarker

    init {
        val options = FaceLandmarker.FaceLandmarkerOptions.builder()
            .setBaseOptions(
                BaseOptions.builder()
                    .setModelAssetPath("face_landmarker.task")
                    .build()
            )
            .setRunningMode(RunningMode.IMAGE)
            .setNumFaces(1)
            .build()

        faceLandmarker = FaceLandmarker.createFromOptions(context, options)
    }

    /**
     * THIS IS WHERE YOUR FUNCTION BELONGS
     */
    fun processBitmap(bitmap: Bitmap): FaceLandmarkerResult? {
        val mpImage = BitmapImageBuilder(bitmap).build()
        return faceLandmarker.detect(mpImage)
    }
}
