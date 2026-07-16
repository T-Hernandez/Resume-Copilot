export interface AlgorithmVersionInfo {
  version: string;
  changes: string[];
  benchmark: {
    scenarios: number;
    passing: number;
    averageConfidence: number;
  };
}

export function createAlgorithmVersionInfo(version: string, changes: string[], benchmark: AlgorithmVersionInfo['benchmark']): AlgorithmVersionInfo {
  return { version, changes, benchmark };
}
