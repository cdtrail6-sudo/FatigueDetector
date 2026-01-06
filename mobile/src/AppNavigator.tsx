import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";

import ScanScreen from "./screens/ScanScreen";
import FatigueDebugScreen from "./dev/FatigueDebugScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="Debug" component={FatigueDebugScreen} options={{ title: "Fatigue Debug" }}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}