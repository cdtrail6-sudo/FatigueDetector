@app.post("/v1/vision/frame-fatigue")
def analyze_frame(...):
    result = analyze_fatigue(frame)
    return result
