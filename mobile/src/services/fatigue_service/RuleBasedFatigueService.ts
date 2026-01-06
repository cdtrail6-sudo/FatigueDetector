import { FatigueService } from './FatigueService';
import { FrameEvent } from '../../contracts/FrameContract';

export class RuleBasedFatigueService implements FatigueService {
  evaluate(events: FrameEvent[]) {
    if (__DEV__) {
      console.log('Events processed:', events.length);
    }

    return {
      level: 'LOW' as const,
      confidence: 0.1,
    };
  }
}