import { useFrameProcessor, Frame } from 'react-native-vision-camera';
import { FrameBuffer } from './frameBuffer';

export const useFramePipeline = () =>
  useFrameProcessor((frame: Frame) => {
    'worklet';

    // SAFE: only write primitive
    FrameBuffer.write(frame.timestamp);
  }, []);