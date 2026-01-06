import { FrameEvent } from '../../contracts/FrameContract';

export interface FatigueService {
  evaluate(events: FrameEvent[]): {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    confidence: number;
  };
}