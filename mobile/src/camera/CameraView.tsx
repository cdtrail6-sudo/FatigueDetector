import React, { useEffect } from 'react';
import { View } from 'react-native';
import { FatiguePipelineRunner } from '../orchestrator/FatiguePipelineRunner';

const runner = new FatiguePipelineRunner();

/**
 * CameraView is now a PURE orchestration / layout component.
 *
 * ❌ Does NOT render <Camera />
 * ❌ Does NOT import VisionCamera
 * ✅ Only manages fatigue pipeline lifecycle
 *
 * VisionCamera MUST be rendered ONLY in ScanScreen
 * AFTER permission === "granted"
 */
export function CameraView({ children }: { children?: React.ReactNode }) {

  useEffect(() => {
    runner.start();
    return () => runner.stop();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
    </View>
  );
}