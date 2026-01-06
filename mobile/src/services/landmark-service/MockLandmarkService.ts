import { LandmarkService } from './LandmarkService';

export class MockLandmarkService implements LandmarkService {
  process(_frame: unknown): null {
    // _frame unused in mock, but required by contract
    return null;
  }
}
