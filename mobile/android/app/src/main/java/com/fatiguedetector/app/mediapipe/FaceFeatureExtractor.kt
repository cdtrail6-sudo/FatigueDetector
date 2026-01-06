/**
 * ⚠️ EXPERIMENTAL / NOT USED
 * Replaced by MediaPipeFaceAnalyzer (Java)
 * Kept for reference & comparison
 */
package com.fatiguedetector.app.mediapipe

import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarkerResult
import com.google.mediapipe.tasks.components.containers.Landmark
import kotlin.math.abs
import kotlin.math.sqrt

data class FatigueFeatures(
    val ear: Float,
    val blink: Boolean,
    val yawn: Boolean,
    val headPose: String,
    val confidence: Float
)

class FaceFeatureExtractor {

    fun extract(
        result: FaceLandmarkerResult,
        imageWidth: Int,
        imageHeight: Int

        println("EAR=$avgEAR BLINK=$blink YAWN=$yawn POSE=$headPose CONF=$confidence")

    ): FatigueFeatures {

        val landmarks = result.faceLandmarks()[0]

        /* ---------------- EYE (EAR) ---------------- */

        // Left eye
        val leftEyeTop = landmarks[159]
        val leftEyeBottom = landmarks[145]
        val leftEyeLeft = landmarks[33]
        val leftEyeRight = landmarks[133]

        // Right eye
        val rightEyeTop = landmarks[386]
        val rightEyeBottom = landmarks[374]
        val rightEyeLeft = landmarks[362]
        val rightEyeRight = landmarks[263]

        val leftEAR = ear(
            leftEyeTop, leftEyeBottom,
            leftEyeLeft, leftEyeRight,
            imageWidth, imageHeight
        )

        val rightEAR = ear(
            rightEyeTop, rightEyeBottom,
            rightEyeLeft, rightEyeRight,
            imageWidth, imageHeight
        )

        val avgEAR = (leftEAR + rightEAR) / 2f
        val blink = avgEAR < EAR_BLINK_THRESHOLD

        /* ---------------- MOUTH (YAWN) ---------------- */

        val mouthTop = landmarks[13]
        val mouthBottom = landmarks[14]
        val mouthOpenDist = distance(mouthTop, mouthBottom, imageWidth, imageHeight)

        val yawn = mouthOpenDist > YAWN_THRESHOLD_PX

        /* ---------------- HEAD POSE ---------------- */

        val nose = landmarks[1]
        val chin = landmarks[152]

        val noseY = nose.y() * imageHeight
        val chinY = chin.y() * imageHeight

        val headPose = when {
            chinY - noseY > HEAD_DOWN_THRESHOLD_PX -> "DOWN"
            noseY - chinY > HEAD_UP_THRESHOLD_PX -> "UP"
            else -> "CENTER"
        }

        /* ---------------- CONFIDENCE ---------------- */

        val confidence = computeConfidence(
            avgEAR = avgEAR,
            mouthOpen = mouthOpenDist,
            headPose = headPose
        )

        return FatigueFeatures(
            ear = avgEAR,
            blink = blink,
            yawn = yawn,
            headPose = headPose,
            confidence = confidence
        )
    }

    /* ---------------- HELPERS ---------------- */

    private fun ear(
        top: Landmark,
        bottom: Landmark,
        left: Landmark,
        right: Landmark,
        w: Int,
        h: Int
    ): Float {
        val vertical = distance(top, bottom, w, h)
        val horizontal = distance(left, right, w, h)
        return if (horizontal == 0f) 0f else vertical / horizontal
    }

    private fun distance(a: Landmark, b: Landmark, w: Int, h: Int): Float {
        val dx = (a.x() - b.x()) * w
        val dy = (a.y() - b.y()) * h
        return sqrt(dx * dx + dy * dy)
    }

    private fun computeConfidence(
        avgEAR: Float,
        mouthOpen: Float,
        headPose: String
    ): Float {

        var score = 1.0f

        // Penalize uncertain eye state
        if (avgEAR < 0.15f || avgEAR > 0.35f) score -= 0.2f

        // Penalize extreme mouth opening
        if (mouthOpen > 80f) score -= 0.2f

        // Penalize extreme head pose
        if (headPose != "CENTER") score -= 0.1f

        return score.coerceIn(0.5f, 1.0f)
    }

    companion object {
        private const val EAR_BLINK_THRESHOLD = 0.18f
        private const val YAWN_THRESHOLD_PX = 45f
        private const val HEAD_DOWN_THRESHOLD_PX = 35f
        private const val HEAD_UP_THRESHOLD_PX = 35f
    }
    fun debugSelfTest() {
    // Fake normalized landmarks (simulated face)
    fun lm(x: Float, y: Float) =
        com.google.mediapipe.tasks.components.containers.Landmark.create(x, y, 0f)

    val eyeTop = lm(0.5f, 0.45f)
    val eyeBottom = lm(0.5f, 0.55f)
    val eyeLeft = lm(0.45f, 0.5f)
    val eyeRight = lm(0.55f, 0.5f)

    val ear = (distance(eyeTop, eyeBottom, 100, 100) /
               distance(eyeLeft, eyeRight, 100, 100))

    println("DEBUG_EAR_EXPECTED≈0.5 → ACTUAL=$ear")
    }

}