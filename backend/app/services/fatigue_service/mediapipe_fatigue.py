
def analyze_fatigue(frame: np.ndarray) -> dict:
    # ------------------------------------------------
    # 1. MediaPipe FaceMesh
    # ------------------------------------------------
    landmarks = extract_landmarks(frame)

    # ------------------------------------------------
    # 2. Feature extraction
    # ------------------------------------------------
    ear = compute_ear(landmarks)
    ear_fatigue = ear_to_fatigue(ear)

    blink_fatigue = blink_detector.get_fatigue_score()

    head_pose_fatigue = compute_head_pose_fatigue(landmarks)

    # ------------------------------------------------
    # 3. FINAL FATIGUE SCORE (⬅️ THIS CODE GOES HERE)
    # ------------------------------------------------
    fatigue_score = (
        0.45 * ear_fatigue +
        0.35 * blink_fatigue +
        0.20 * head_pose_fatigue
    )

    fatigue_score = round(fatigue_score, 3)

    # ------------------------------------------------
    # 4. Fatigue level (raw, unsmoothed)
    # ------------------------------------------------
    fatigue_level = classify_fatigue(fatigue_score)

    return {
        "ear": round(ear, 3),
        "blink_fatigue": blink_fatigue,
        "head_pose_fatigue": head_pose_fatigue,
        "fatigue_score": fatigue_score,
        "fatigue_level": fatigue_level,
    }

