// mobile/src/utils/blinkDetector.ts

export class BlinkDetector {
  private closedFrames = 0;
  private totalBlinks = 0;

  constructor(
    private readonly blinkThreshold: number = 0.22,
    private readonly minFrames: number = 2,
    private readonly maxFrames: number = 15
  ) {}

  /**
   * Update detector with current EAR value.
   * @returns true if a blink is detected on this frame
   */
  update(ear: number): boolean {
    if (ear < this.blinkThreshold) {
      this.closedFrames++;
      return false;
    }

    if (
      this.closedFrames >= this.minFrames &&
      this.closedFrames <= this.maxFrames
    ) {
      this.totalBlinks++;
      this.closedFrames = 0;
      return true;
    }

    this.closedFrames = 0;
    return false;
  }

  /**
   * Total blinks detected since initialization.
   */
  getTotalBlinks(): number {
    return this.totalBlinks;
  }

  /**
   * Reset blink counters (use when baseline resets).
   */
  reset(): void {
    this.closedFrames = 0;
    this.totalBlinks = 0;
  }
}