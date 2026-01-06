import { useRef } from "react";

export function useEMA(alpha: number, initial = 0) {
  const valueRef = useRef(initial);

  function update(next: number) {
    valueRef.current =
      alpha * next + (1 - alpha) * valueRef.current;
    return valueRef.current;
  }

  return update;
}