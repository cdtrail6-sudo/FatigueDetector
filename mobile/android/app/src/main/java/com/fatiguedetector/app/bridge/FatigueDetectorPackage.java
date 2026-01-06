package com.fatiguedetector.app.bridge;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.fatiguedetector.app.bridge.FatigueDetectorModule;


public class FatigueDetectorPackage implements ReactPackage {

  @Override
  public List<NativeModule> createNativeModules(
      ReactApplicationContext reactContext
  ) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new FatigueDetectorModule(reactContext));
    return modules;
  }

  @Override
  public List<ViewManager> createViewManagers(
      ReactApplicationContext reactContext
  ) {
    return Collections.emptyList();
  }
}