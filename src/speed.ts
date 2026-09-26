let multiplier = 1;

export function getSpeedMultiplier(): number {
  return multiplier;
}

export function setSpeedMultiplier(value: number): void {
  multiplier = value;
}

/** A sleep that shrinks as the speed multiplier grows. */
export function fastSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms / multiplier));
}
