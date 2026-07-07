export interface Confidence {
  value: number; // 0..100
}

export function createConfidence(value: number): Confidence {
  return { value };
}
