import { FrameBuffer } from '../camera/frameBuffer';
import { FatiguePipeline } from './FatiguePipeline';

export class FatiguePipelineRunner {
  private pipeline = new FatiguePipeline();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      const ts = FrameBuffer.read();
      if (!ts) return;

      this.pipeline.processFrame({ ts });
    }, 100); // 10 FPS max
  }

  stop() {
    if (!this.intervalId) return;

    clearInterval(this.intervalId);
    this.intervalId = null;
  }
}