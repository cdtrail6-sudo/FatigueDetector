import { RuleBasedFatigueService } from '../services/fatigue_service/RuleBasedFatigueService';
import { FrameEvent } from '../contracts/FrameContract';

export class FatiguePipeline {
  private fatigueService = new RuleBasedFatigueService();
  private events: FrameEvent[] = [];

  processFrame = (event: FrameEvent) => {
    this.events.push(event);

    const result = this.fatigueService.evaluate(this.events);

    if (__DEV__) {
      console.log('Fatigue result:', result);
    }

    return result;
  };
}