export type FatigueLevel = "LOW" | "MEDIUM" | "HIGH";

export function resolveFatigue(
  score: number,
  prev: FatigueLevel
): FatigueLevel {
  if (prev === "LOW" && score > 0.55) return "MEDIUM";
  if (prev === "MEDIUM" && score < 0.45) return "LOW";

  if (prev === "MEDIUM" && score > 0.75) return "HIGH";
  if (prev === "HIGH" && score < 0.65) return "MEDIUM";

  return prev;
}