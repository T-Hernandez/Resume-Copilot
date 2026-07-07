export interface Score {
  value: number; // 0..100
}

export function createScore(value: number): Score {
  return { value };
}
