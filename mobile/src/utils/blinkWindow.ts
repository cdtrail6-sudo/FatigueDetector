type BlinkEvent = { ts: number };

export class BlinkWindow {
  private windowMs: number;
  private blinks: BlinkEvent[] = [];

  constructor(windowSeconds = 60) {
    this.windowMs = windowSeconds * 1000;
  }

  addBlink(timestamp: number) {
    this.blinks.push({ ts: timestamp });
    this.cleanup(timestamp);
  }

  getBlinkRate(now: number) {
    this.cleanup(now);
    const rate = (this.blinks.length * 60000) / this.windowMs;
    return Math.min(60, Math.max(5, rate)); // physiological clamp
  }

  reset() {
    this.blinks = [];
  }

  private cleanup(now: number) {
    this.blinks = this.blinks.filter(
      b => now - b.ts <= this.windowMs
    );
  }
}